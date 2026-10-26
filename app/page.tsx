"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { useFamily } from "@/components/ProfileProvider";
import { ApplianceModelPicker } from "@/components/ApplianceModelPicker";
import { apiFetch } from "@/lib/api";
import { DISHES } from "@/data/dishes";
import { dishImage } from "@/data/dish-images";
import { FOOD_BY_ID } from "@/data/foods";
import { APPLIANCES, APPLIANCE_DETAILS, APPLIANCES_LS, DETAIL_LS, STYLES_LS, type Appliance } from "@/data/appliances";
import { generate, type Color, type DishResult } from "@/lib/generate";
import { matchesQuery } from "@/lib/search";
import { SearchInput } from "@/components/SearchInput";
import type { Course, Dish, Member, PreferenceMap, Slot } from "@/lib/types";
import { haptic } from "@/lib/native";
import { PremiumLockDialog, usePremium } from "@/components/PremiumGate";

const DISH_BY_ID: Record<string, Dish> = Object.fromEntries(DISHES.map((d) => [d.id, d]));

// First-launch-style flow: À table asks one question per screen. Header + bottom nav stay;
// only the dish list scrolls. Who's eating → when → a course at a time (0/1/several each).
const STEPS = [
  { key: "diners", question: "Pour qui je cuisine aujourd'hui ?" },
  { key: "when", question: "C'est pour quand ?" },
  { key: "style", question: "Envie de manger comment ?" },
  { key: "appareils", question: "Tu cuisines avec quoi ?" },
  { key: "entree", question: "On commence par une entrée ?" },
  { key: "plat", question: "Et pour le plat principal ?" },
  { key: "dessert", question: "Un petit dessert pour finir ?" },
] as const;

// Meal "mood" filters (à la tryromi) shown between the diners and the courses. Multi-select
// and optional — picking several keeps only the dishes that fit ALL of them, but never empties
// a step (we fall back to the full list if the combo has no match for a given course).
const MEAL_STYLES = [
  { key: "rapide", label: "Rapide à faire", emoji: "⚡", hint: "Prêt en moins de 10 minutes" },
  { key: "faible-calorie", label: "Faible en calorie", emoji: "🪶", hint: "Maigre, sans gras ni sucre" },
  { key: "proteine", label: "Protéiné", emoji: "💪", hint: "Riche en viande, poisson ou œufs" },
  { key: "leger", label: "Léger/Healthy", emoji: "🥗", hint: "Frais, léger et peu gras" },
  { key: "reconfort", label: "Réconfortant", emoji: "🍲", hint: "Mijoté, généreux, cocooning" },
] as const;
type MealStyle = (typeof MEAL_STYLES)[number]["key"];

const MEAT_FISH_CATS = new Set(["viandes", "poissons", "charcuterie"]);
const PROTEIN_IDS = new Set([
  "oeufs", "omelette", "tofu", "tempeh", "seitan", "steak-vegetal", "galette-vegetale",
  "falafel", "lentilles", "pois-chiches", "haricots-rouges", "haricots-blancs", "surimi",
]);
// "Léger/Healthy" is more than just quick — exclude fried, rich/creamy and heavy comfort dishes
// so it actually reads as light, not "pizza in 15 min".
const HEAVY_IDS = new Set([
  // fried
  "frites", "nuggets", "poisson-pane", "cordon-bleu", "pommes-noisettes", "nems", "beignets", "friture",
  // rich / creamy
  "mayonnaise", "bechamel", "gratin-dauphinois", "lardons", "fromage-rape", "creme-fraiche", "beurre",
  // heavy comfort dishes + charcuterie-ish
  "pizza", "lasagnes", "hamburger", "kebab", "tacos", "panini", "croque-monsieur", "tartiflette",
  "fondue", "cassoulet", "raclette", "reblochon", "hachis-parmentier", "gratin-pates", "choucroute",
  "boeuf-bourguignon", "saucisses", "merguez", "chorizo", "boudin", "travers-porc", "jambon-cru", "saucisson-sec",
]);

function dishHasProtein(d: Dish): boolean {
  return d.ingredients.some((id) => MEAT_FISH_CATS.has(FOOD_BY_ID[id]?.category ?? "") || PROTEIN_IDS.has(id));
}
function dishIsLight(d: Dish): boolean {
  if (d.cookMin > 30) return false; // slow-cooked = not "light"
  return !d.ingredients.some((id) => HEAVY_IDS.has(id) || FOOD_BY_ID[id]?.category === "charcuterie");
}
// "Faible en calorie": lean. We have NO real calorie data on dishes, so this is a best-effort
// heuristic — drop the obviously calorie-dense families (cheese, charcuterie, nuts/seeds, sweets,
// pastries, apero snacks) plus the fatty extras (oils, butter, cream, mayo, pesto, coco, spreads)
// and anything already flagged as heavy/fried. Works best on mains; edge courses fall back.
const CALORIE_DENSE_CATS = new Set([
  "charcuterie", "fromages", "fruits-secs", "sucre", "apero", "boulangerie",
]);
const CALORIE_DENSE_IDS = new Set([
  "avocat", "huile-olive", "huile-tournesol", "beurre", "beurre-cacahuete", "creme-fraiche",
  "creme-liquide", "mascarpone", "mayonnaise", "bechamel", "pesto", "vinaigrette", "sauce-blanche",
  "pate-feuilletee", "lait-coco", "noix-coco", "guacamole", "olives", "pate-tartiner", "miel",
  "confiture", "sirop", "sirop-erable",
]);
function dishIsLowCal(d: Dish): boolean {
  return !d.ingredients.some((id) => {
    const cat = FOOD_BY_ID[id]?.category ?? "";
    return HEAVY_IDS.has(id) || CALORIE_DENSE_IDS.has(id) || CALORIE_DENSE_CATS.has(cat);
  });
}
function matchesStyle(d: Dish, style: MealStyle): boolean {
  switch (style) {
    case "rapide":
      return d.cookMin <= 10;
    case "faible-calorie":
      return dishIsLowCal(d);
    case "proteine":
      return dishHasProtein(d);
    case "leger":
      return dishIsLight(d);
    case "reconfort":
      return d.cookMin >= 45;
    default:
      return true;
  }
}

const SKIP_LABEL: Partial<Record<Course, string>> = {
  entree: "Pas d'entrée, merci",
  plat: "Pas de plat, merci",
  dessert: "Pas de dessert, merci",
};

const DAY_ABBR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const DOT: Record<Color, string> = {
  vert: "bg-green-500",
  orange: "bg-amber-500",
  rouge: "bg-red-500",
  gris: "bg-stone-300",
};
const CARD: Record<Color, string> = {
  vert: "border-green-300 bg-green-50",
  orange: "border-amber-300 bg-amber-50",
  rouge: "border-red-300 bg-red-50",
  gris: "border-stone-200 bg-white",
};
// Shown in the dish-card photo square when a dish has no photo yet (only 49/166 do).
const COURSE_EMOJI: Record<string, string> = { entree: "🥗", plat: "🍲", dessert: "🍰" };

// The four verdicts a chip can carry. "aime" only ever appears as the whole-dish "Tout le monde aime".
const VERDICT = {
  hate: { emoji: "👎", chip: "bg-red-100 text-red-900" },
  meh: { emoji: "😐", chip: "bg-amber-100 text-amber-900" },
  love: { emoji: "❤️", chip: "bg-pink-100 text-pink-900" },
  like: { emoji: "👍", chip: "bg-green-100 text-green-900" },
} as const;
type Verdict = keyof typeof VERDICT;

// `people` are member IDs (avatars). `everyone` = the whole table shares the verdict, so we say
// "Tout le monde" rather than list them. `foodId` is the ingredient the chip is about (null only for
// the whole-dish "Tout le monde aime"). The card renders: avatars + names + food name + verdict emoji.
type TasteChip = { key: string; verdict: Verdict; people: string[]; everyone: boolean; foodId: string | null };

// Turn a dish's per-ingredient verdicts into a SHORT, deduped set of chips. The rules, in plain terms:
//   - never a chip for an ingredient nobody rated (the old grey "not set" noise is gone),
//   - one chip per problem (dislike, then tolerate) and per coup de cœur, worst first,
//   - if a whole group is everyone eating -> "Tout le monde" instead of listing them,
//   - and when there is nothing to flag but everyone likes everything -> a single "Tout le monde aime".
function tasteChips(result: DishResult, dinerCount: number): TasteChip[] {
  const chips: TasteChip[] = [];
  const all = (n: number) => dinerCount > 0 && n === dinerCount;
  // Avatars are kept even when it's "everyone" (Paul wants the faces every time); the `everyone` flag
  // only swaps the NAMES for "Tout le monde" so the text doesn't run long.
  const chip = (verdict: Verdict, prefix: string, ing: { foodId: string }, people: string[]): TasteChip => ({
    key: `${prefix}-${ing.foodId}`,
    verdict,
    everyone: all(people.length),
    people,
    foodId: ing.foodId,
  });

  let hasProblem = false;
  let allLiked = dinerCount > 0;

  for (const ing of result.ingredients) {
    if (ing.haters.length) {
      chips.push(chip("hate", "h", ing, ing.haters));
      hasProblem = true;
    }
    if (ing.tolerant.length) {
      chips.push(chip("meh", "t", ing, ing.tolerant));
      hasProblem = true;
    }
    // "Everyone likes this ingredient" only holds if every diner rated it O/favourite.
    if (ing.likers.length + ing.lovers.length !== dinerCount) allLiked = false;
  }

  // Coup de cœur highlights (independent of problems — a dish can have both).
  for (const ing of result.ingredients) {
    if (ing.lovers.length) chips.push(chip("love", "l", ing, ing.lovers));
  }

  // Reassurance when there is genuinely nothing to flag and everyone is on board. Every ingredient is
  // then rated O+ by all diners, so any ingredient's likers+lovers ARE the whole table -> use them for
  // the avatars.
  if (!hasProblem && allLiked && !chips.some((c) => c.verdict === "love")) {
    const first = result.ingredients[0];
    const diners = first ? [...first.likers, ...first.lovers] : [];
    chips.unshift({ key: "all", verdict: "like", people: diners, everyone: true, foodId: null });
  }

  // Keep the card compact: worst-first order is already in place; cap the rest.
  return chips.slice(0, 4);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "1 entrée · 2 plats · 1 dessert au menu" — reflects exactly what's chosen so far.
function courseSummary(dishes: Dish[]): string {
  const c = { entree: 0, plat: 0, dessert: 0 } as Record<string, number>;
  for (const d of dishes) c[d.course]++;
  const parts: string[] = [];
  if (c.entree) parts.push(`${c.entree} entrée${c.entree > 1 ? "s" : ""}`);
  if (c.plat) parts.push(`${c.plat} plat${c.plat > 1 ? "s" : ""}`);
  if (c.dessert) parts.push(`${c.dessert} dessert${c.dessert > 1 ? "s" : ""}`);
  return parts.length ? `${parts.join(" · ")} au menu` : "";
}

export default function HomePage() {
  const router = useRouter();
  const { members, me } = useFamily();
  const [prefs, setPrefs] = useState<PreferenceMap>({});
  const [favorites, setFavorites] = useState<Record<string, string[]>>({}); // coup de cœur, per person
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  // Repas is the app's landing route, so its step-0 back only makes sense when the user actually came
  // from somewhere else in the app (nav/deep link) — not on a cold open straight onto Repas.
  const [canExit, setCanExit] = useState(false);
  const [diners, setDiners] = useState<string[]>([]);
  const [guests, setGuests] = useState(0); // extra anonymous mouths for this meal (scales shopping)
  const [mealDate, setMealDate] = useState(() => ymd(new Date()));
  const [mealSlot, setMealSlot] = useState<Slot>(() => (new Date().getHours() < 16 ? "midi" : "soir"));
  const [minDaysToShow, setMinDaysToShow] = useState(14); // grows to cover a day preselected from the calendar
  const dateScrollRef = useRef<HTMLDivElement>(null); // the "when" chips row, to centre the chosen day
  const [mealStyles, setMealStyles] = useState<MealStyle[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [applianceDetail, setApplianceDetail] = useState<Record<string, string>>({}); // brand/model per appliance
  const [detailModal, setDetailModal] = useState<string | null>(null); // appliance key whose brand/model popup is open
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dishSearch, setDishSearch] = useState("");
  const [mealLocked, setMealLocked] = useState(false); // a blurred dish was tapped -> show the offer
  const [footerCollapsed, setFooterCollapsed] = useState(false);
  // A manual fold/unfold must WIN over the scroll-driven auto-fold: expanding the footer shrinks the
  // dish list, which makes iOS bump scrollTop down, which would re-fire onDishScroll and instantly
  // re-collapse (the "impossible to unfold unless scrolled to the very top" bug). Suppress the
  // auto-fold for a beat after a manual toggle so the reflow settles.
  const suppressFold = useRef(false);
  function toggleFooter() {
    void haptic("light");
    suppressFold.current = true;
    setFooterCollapsed((v) => !v);
    window.setTimeout(() => {
      suppressFold.current = false;
    }, 450);
  }
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // The upcoming days as chips for the "when" step — the next two weeks, extended when the calendar
  // sent a day further out (so its preselected chip exists).
  const days = useMemo(() => {
    const base = new Date();
    return Array.from({ length: Math.min(31, minDaysToShow) }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const label = i === 0 ? "Auj." : DAY_ABBR[d.getDay()];
      return { ymd: ymd(d), label, num: d.getDate() };
    });
  }, [minDaysToShow]);

  // Preselect the day + slot the calendar sent via ?date=&slot= (its "Ajouter un repas" button).
  // Only offer the step-0 exit when we arrived from elsewhere in the app (history to go back to).
  useEffect(() => {
    setCanExit(typeof window !== "undefined" && window.history.length > 1);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("date");
    const s = params.get("slot");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setMealDate(d);
      const today = ymd(new Date());
      const [y1, m1, d1] = today.split("-").map(Number);
      const [y2, m2, d2] = d.split("-").map(Number);
      const diff = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
      if (diff >= 14) setMinDaysToShow(Math.min(31, diff + 1));
    }
    if (s === "midi" || s === "soir") setMealSlot(s);
  }, []);

  // On the "when" step, scroll the chosen day to the middle of the chips row so the user SEES that the
  // day they tapped in the calendar is already selected. Double rAF: the chips (and any grown `days`
  // window from a deep-link) must be laid out before offsetLeft is meaningful, else it scrolls nowhere.
  useEffect(() => {
    if (step !== 1) return;
    let r1 = 0;
    let r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        const cont = dateScrollRef.current;
        const el = cont?.querySelector<HTMLElement>(`[data-ymd="${mealDate}"]`);
        if (cont && el) {
          cont.scrollTo({
            left: Math.max(0, el.offsetLeft - cont.clientWidth / 2 + el.clientWidth / 2),
            behavior: "smooth",
          });
        }
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [step, mealDate, days]);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/preferences").then((r) => r.json()).catch(() => ({})),
      apiFetch("/api/preferences/favorites").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([p, f]: [PreferenceMap, Record<string, string[]>]) => {
        setPrefs(p ?? {});
        setFavorites(f ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  // Pre-fill the last meal-style + appliance answers (kept only client-side).
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STYLES_LS) || "[]");
      if (Array.isArray(s)) setMealStyles(s.filter((x): x is MealStyle => MEAL_STYLES.some((m) => m.key === x)));
      const a = JSON.parse(localStorage.getItem(APPLIANCES_LS) || "[]");
      if (Array.isArray(a)) setAppliances(a.filter((x): x is Appliance => APPLIANCES.some((ap) => ap.key === x)));
      const d = JSON.parse(localStorage.getItem(DETAIL_LS) || "{}");
      if (d && typeof d === "object") setApplianceDetail(d);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleDiner(id: string) {
    void haptic("light");
    setDiners((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }
  function toggleSelect(id: string) {
    void haptic("light");
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  // These are "habits" — they pre-fill next time from the LAST CREATED meal, never from a toggle that
  // went nowhere. So toggling only updates local state; the write to localStorage happens once, in
  // launchToCalendar, after the meal is actually saved (see persistHabits). Persisting on toggle was
  // the bug: merely opening the wizard and tapping an appliance saved it, which pre-checked it forever
  // AND made it appear in "Mes appareils" even though no meal was ever created with it.
  function toggleStyle(k: MealStyle) {
    void haptic("light");
    setMealStyles((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  }
  function toggleAppliance(k: Appliance) {
    void haptic("light");
    const turningOn = !appliances.includes(k);
    setAppliances((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
    // Ask the brand then model in a centered popup every time such an appliance is (re)selected.
    if (turningOn && APPLIANCE_DETAILS[k]) setDetailModal(k);
  }
  function putDetail(key: string, value: string) {
    setApplianceDetail((cur) => ({ ...cur, [key]: value }));
  }

  const isCourseStep = step >= 4;
  const currentCourse = STEPS[step].key as Course;

  const results = useMemo(
    () => (isCourseStep && diners.length ? generate(diners, prefs, currentCourse, favorites) : []),
    [isCourseStep, currentCourse, diners, prefs, favorites],
  );
  // id -> Member, so a dish card can render the avatar of each person a chip is about.
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  // Trial lapsed -> most dishes are blurred as a teaser; tapping one opens the offer.
  const locked = !usePremium();
  // Three groups, all shown (nothing hidden behind a button):
  //   - "Ça te correspond" / "Nos idées" : fits every selected mood (or, with no mood, all non-red)
  //   - "Aussi possible"                 : outside the mood filter (empty when no mood is set)
  //   - "Quelqu'un n'aime pas"           : a red dish (someone won't eat it)
  // Within each group, sorted by how the family feels: green -> orange (tolère) -> grey (not rated).
  const COLOR_RANK: Record<Color, number> = { vert: 0, orange: 1, gris: 2, rouge: 3 };
  const byColor = (a: DishResult, b: DishResult) => COLOR_RANK[a.color] - COLOR_RANK[b.color];
  const visible = results.filter((r) => matchesQuery(r.dish.name, dishSearch));
  const fitsMood = (r: DishResult) => mealStyles.every((s) => matchesStyle(r.dish, s));
  const recoResults = visible.filter((r) => r.color !== "rouge" && fitsMood(r)).sort(byColor);
  const otherResults = mealStyles.length
    ? visible.filter((r) => r.color !== "rouge" && !fitsMood(r)).sort(byColor)
    : [];
  const redResults = visible.filter((r) => r.color === "rouge").sort(byColor);
  const okResults = recoResults; // the primary, always-sharp list drives the teaser-blur count
  // First ~20% of the recommended list stays sharp so an expired user can still taste the feature.
  const sharpCount = locked ? Math.max(1, Math.ceil(okResults.length * 0.2)) : okResults.length;

  const selectedDishes = useMemo(
    () => [...selectedIds].map((id) => DISH_BY_ID[id]).filter(Boolean) as Dish[],
    [selectedIds],
  );
  const courseSelected = isCourseStep
    ? selectedDishes.filter((d) => d.course === currentCourse).length
    : 0;

  const isLast = step === STEPS.length - 1;
  const summary = courseSummary(selectedDishes);
  const progress = ((step + 1) / STEPS.length) * 100;
  const canContinue = step === 0 ? diners.length > 0 : step <= 3 ? true : courseSelected > 0;
  const showSearch = isCourseStep && !loading && results.length > 6;

  function goStep(i: number) {
    void haptic("light");
    setDishSearch("");
    setFooterCollapsed(false);
    setStep(Math.max(0, Math.min(STEPS.length - 1, i)));
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  // On the course steps, fold the footer down as the user scrolls into the dish list so
  // more dishes are visible; unfold it back near the top. A little hysteresis avoids flicker.
  function onDishScroll() {
    if (!isCourseStep || suppressFold.current) return;
    const top = scrollRef.current?.scrollTop ?? 0;
    if (top > 56) setFooterCollapsed(true);
    else if (top < 24) setFooterCollapsed(false);
  }

  async function launchToCalendar() {
    const chosen = selectedDishes;
    if (chosen.length === 0) return;
    void haptic("light"); // immediate press feedback; the success buzz lands once it's saved
    setLaunchError("");
    setLaunching(true);
    try {
      const responses = await Promise.all(
        chosen.map((dish) =>
          apiFetch("/api/meal-plan", {
            method: "POST",
            body: JSON.stringify({
              op: "add",
              date: mealDate,
              slot: mealSlot,
              dishId: dish.id,
              dishName: dish.name,
              course: dish.course,
              diners,
              guests,
            }),
          }),
        ),
      );
      if (responses.some((r) => !r.ok)) throw new Error("save_failed");
      void haptic("success"); // meal saved to the calendar — a payoff moment
      // NOW commit the habits: the just-created meal becomes the template the wizard pre-fills next
      // time, and its appliances are what "Mes appareils" shows. Toggling alone never gets here.
      try {
        localStorage.setItem(STYLES_LS, JSON.stringify(mealStyles));
        localStorage.setItem(APPLIANCES_LS, JSON.stringify(appliances));
        localStorage.setItem(DETAIL_LS, JSON.stringify(applianceDetail));
      } catch {
        /* private mode — habits just won't carry over, no harm */
      }
      // A freshly-planned meal must NOT inherit a stale "Démarré"/"Terminé" from a meal that lived in
      // this same date+slot before: clear this slot's cook state so the calendar shows it un-started.
      try {
        const slotKey = `${mealDate}|${mealSlot}`;
        for (const ls of ["atable.cook.started", "atable.cook.done"]) {
          const set = new Set<string>(JSON.parse(localStorage.getItem(ls) || "[]"));
          if (set.delete(slotKey)) localStorage.setItem(ls, JSON.stringify([...set]));
        }
        localStorage.removeItem(`atable.cook.steps.${slotKey}`);
      } catch {
        /* ignore */
      }
      // No cart event here: the "C'est parti" transition covers the header, so let the /semaine
      // mount detect the new items and hop the cart there, where it's actually visible.
      // ?focus tells /semaine which day + slot to jump to and centre (the meal we just added).
      setTimeout(() => router.push(`/semaine?focus=${mealDate}_${mealSlot}`), 900);
    } catch {
      void haptic("error"); // save failed — a distinct error buzz
      setLaunching(false);
      setLaunchError("Repas pas enregistré, réessaie.");
    }
  }

  const node = (
    <div
      className="fixed inset-x-0 z-10 flex flex-col bg-[var(--background)]"
      style={{
        // Pulled 15px above the header's bottom edge so the mascot + progress sit higher and the gap
        // under the orange header stops feeling empty. The panel is opaque, so the header simply
        // reads 15px shorter.
        top: "calc(var(--header-h) - 15px)",
        // Run the wizard's base background all the way to the bottom so the floating nav sits OVER
        // the content (like every other page), instead of in a strip below a cream block. The footer
        // keeps a --bottomnav-space bottom pad so the CTA still clears the nav.
        bottom: "0px",
      }}
    >
      {/* STATIC TOP — progress, the mascot's question, and (on course steps) the search. */}
      {/* Its OWN opaque background + rounded bottom, layered above the list: the cards scroll UNDER it
          and get clipped by the curve instead of a hard straight line. The background is required —
          without it the block is see-through and nothing masks the cards passing beneath. */}
      <div className="relative z-20 shrink-0 rounded-b-[28px] bg-[var(--background)] px-4 pb-3 pt-3 shadow-[0_6px_16px_-10px_rgba(43,42,40,0.28)]">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => goStep(step - 1)}
              aria-label="Étape précédente"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition active:scale-90"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : canExit ? (
            <button
              type="button"
              onClick={() => {
                void haptic("light");
                router.back();
              }}
              aria-label="Retour"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition active:scale-90"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <div className="h-9 w-9 shrink-0" aria-hidden />
          )}
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--primary-soft)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
              style={{ width: `${Math.max(8, progress)}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-14 w-14 shrink-0 object-contain" />
          <div className="relative mt-1.5 rounded-2xl bg-white px-4 py-2.5 text-base font-extrabold text-stone-800 shadow-[0_6px_20px_rgba(43,42,40,0.14)]">
            {STEPS[step].question}
            <span className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 bg-white" aria-hidden />
          </div>
        </div>

        {showSearch && (
          <div className="mt-3">
            <SearchInput
              value={dishSearch}
              onChange={setDishSearch}
              placeholder={`Rechercher ${currentCourse === "entree" ? "une entrée" : currentCourse === "plat" ? "un plat" : "un dessert"}…`}
              ariaLabel="Rechercher un plat"
            />
          </div>
        )}
      </div>

      {/* SCROLL — only the dishes (or the diner grid / when picker) move. */}
      <div ref={scrollRef} onScroll={onDishScroll} className={`no-scrollbar -mt-[28px] min-h-0 overflow-y-auto px-4 pb-4 pt-10 ${isCourseStep ? "flex-1" : "flex-none"}`}>
        <div key={step} className="step-in flex flex-col gap-5">
          {step === 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {members.map((p) => {
                  const active = diners.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleDiner(p.id)}
                      aria-pressed={active}
                      className={`btn-3d flex-col gap-1 px-3 py-4 text-base ${active ? "btn-primary" : "btn-neutral"}`}
                    >
                      <Avatar person={p} size={48} />
                      {p.id === me.id ? "Moi" : p.name}
                    </button>
                  );
                })}
                {/* Same card, but it adds a guest/profile: jumps to Settings with the family
                    card centred and its "add a member" form already open. */}
                {/* Add anonymous extra mouths (guests): a −N+ stepper that scales the shopping list. */}
                <div className="flex flex-col items-center justify-center gap-2 rounded-btn border-2 border-[var(--neutral-border)] bg-white px-3 py-3 shadow-[0_4px_0_var(--neutral-shadow)]">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-stone-600">
                    <Icon name="user-plus" size={18} /> Invités
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        void haptic("light");
                        setGuests((g) => Math.max(0, g - 1));
                      }}
                      aria-label="Un invité de moins"
                      disabled={guests === 0}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--neutral-border)] bg-white text-2xl font-extrabold leading-none text-stone-700 transition active:scale-90 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xl font-extrabold text-stone-900">{guests}</span>
                    <button
                      type="button"
                      onClick={() => {
                        void haptic("light");
                        setGuests((g) => Math.min(20, g + 1));
                      }}
                      aria-label="Un invité de plus"
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--primary-soft)] text-2xl font-extrabold leading-none text-[var(--primary)] transition active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/famille")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] py-3 text-base font-extrabold text-[var(--primary)] transition active:scale-95"
              >
                <Icon name="user-plus" size={20} /> Inviter un compte
              </button>
              <p className="text-sm text-stone-500">
                Pas encore réglé les goûts&nbsp;?{" "}
                <Link href="/preferences" className="font-bold text-[var(--primary)] underline">
                  C&apos;est par ici
                </Link>
                .
              </p>
            </>
          ) : step === 1 ? (
            <>
              <div>
                <div className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">Quel jour&nbsp;?</div>
                <div ref={dateScrollRef} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {days.map((d, i) => {
                    const on = mealDate === d.ymd;
                    const wide = i === 0; // "Aujourd'hui" gets the width of two chips
                    return (
                      <button
                        key={d.ymd}
                        type="button"
                        data-ymd={d.ymd}
                        onClick={() => {
                          void haptic("light");
                          setMealDate(d.ymd);
                        }}
                        aria-pressed={on}
                        className={`flex h-16 shrink-0 flex-col items-center justify-center rounded-2xl border-2 font-extrabold transition active:scale-95 ${
                          wide ? "w-32 px-2" : "w-16"
                        } ${
                          on
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-[0_3px_0_var(--primary-dark)]"
                            : "border-[var(--neutral-border)] bg-white text-stone-700"
                        }`}
                      >
                        {wide ? (
                          <span className="text-base">Aujourd&apos;hui</span>
                        ) : (
                          <>
                            <span className="text-xs">{d.label}</span>
                            <span className="text-xl leading-none">{d.num}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">Midi ou soir&nbsp;?</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["midi", "soir"] as const).map((s) => {
                    const on = mealSlot === s;
                    const isMidi = s === "midi";
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          void haptic("light");
                          setMealSlot(s);
                        }}
                        aria-pressed={on}
                        className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3.5 text-base font-extrabold transition active:scale-95 ${
                          isMidi
                            ? on
                              ? "border-amber-500 bg-amber-400 text-white shadow-[0_4px_16px_rgba(245,158,11,0.5)]"
                              : "border-amber-200 bg-white text-amber-700"
                            : on
                              ? "border-indigo-500 bg-indigo-500 text-white shadow-[0_4px_16px_rgba(99,102,241,0.5)]"
                              : "border-indigo-200 bg-white text-indigo-700"
                        }`}
                      >
                        <Icon name={isMidi ? "sun" : "moon"} size={20} strokeWidth={2.2} /> {isMidi ? "Midi" : "Soir"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : step === 2 ? (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm font-semibold text-stone-500">
                Plusieurs choix possibles en même temps&nbsp;!
              </p>
              {MEAL_STYLES.map((s) => {
                const on = mealStyles.includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleStyle(s.key)}
                    aria-pressed={on}
                    className={`clay-card flex items-center gap-3 border-2 bg-white p-4 text-left transition active:scale-[0.99] ${
                      on ? "border-[var(--primary)]" : "border-stone-200"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden>{s.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-extrabold leading-tight text-stone-900">{s.label}</div>
                      <div className="truncate text-xs font-semibold text-stone-500">{s.hint}</div>
                    </div>
                    {/* Same round check as the dish cards: orange ring, fills with a white tick. */}
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--primary)] transition-colors ${
                        on ? "bg-[var(--primary)]" : "bg-white"
                      }`}
                    >
                      {on && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : step === 3 ? (
            <div className="flex flex-col gap-4">
              <p className="text-center text-sm font-semibold text-stone-500">
                Plusieurs choix possibles en même temps&nbsp;!
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {APPLIANCES.map((a) => {
                  const on = appliances.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => toggleAppliance(a.key)}
                      aria-pressed={on}
                      className={`btn-3d flex-col gap-2 px-1 py-4 text-sm ${on ? "btn-primary" : "btn-neutral"}`}
                    >
                      <Icon name={a.icon} size={34} strokeWidth={1.85} />
                      <span className="text-center leading-tight">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-card" />
              ))}
            </div>
          ) : recoResults.length === 0 && otherResults.length === 0 && redResults.length === 0 ? (
            <p className="text-stone-600">
              {dishSearch ? "Aucun plat ne correspond à ta recherche." : "Rien dans ce catalogue pour l'instant."}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Recommandé — matches the mood (or everything when no mood), best colours first.
                  Only this group's first fifth stays sharp for the teaser blur. */}
              <DishSection
                title={mealStyles.length ? "Ça te correspond" : "Nos idées"}
                tone="green"
                results={recoResults}
                blurredFrom={sharpCount}
                selectedIds={selectedIds}
                onToggle={toggleSelect}
                memberById={memberById}
                dinerCount={diners.length}
                onBlockedTap={() => setMealLocked(true)}
              />
              {/* Outside the chosen mood, still fully shown — never framed as a worse dish. */}
              {otherResults.length > 0 && (
                <DishSection
                  title="Aussi possible"
                  tone="stone"
                  results={otherResults}
                  blurredFrom={locked ? 0 : otherResults.length}
                  selectedIds={selectedIds}
                  onToggle={toggleSelect}
                  memberById={memberById}
                  dinerCount={diners.length}
                  onBlockedTap={() => setMealLocked(true)}
                />
              )}
              {/* Someone won't eat it. Always visible, no reveal button to press. */}
              {redResults.length > 0 && (
                <DishSection
                  title="Quelqu'un n'aime pas"
                  tone="red"
                  results={redResults}
                  blurredFrom={locked ? 0 : redResults.length}
                  selectedIds={selectedIds}
                  onToggle={toggleSelect}
                  memberById={memberById}
                  dinerCount={diners.length}
                  onBlockedTap={() => setMealLocked(true)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* STATIC BOTTOM — a sheet with rounded top corners holding the CTA. On the dish steps it
          folds down as you scroll; a chevron handle stays so you can unfold it back. On dish steps the
          white sheet runs to the very bottom (pb clears the nav) so the nav floats over white, not a
          cream gap, and the CTA sits just above the bar. */}
      <div className={`relative shrink-0 px-4 ${isCourseStep ? "rounded-t-3xl bg-white pt-1.5 pb-[calc(var(--bottomnav-space)-12px)] shadow-[0_-6px_20px_rgba(43,42,40,0.07)]" : "pt-3.5 pb-3 mb-[calc(var(--bottomnav-space)+45px)]"}`}>
        {isCourseStep && (
          // Grab handle sitting in a little notch that bumps up out of the sheet's top edge (same
          // rounded shape, smaller), centred — tap to fold/unfold the sheet.
          <button
            type="button"
            onClick={toggleFooter}
            aria-expanded={!footerCollapsed}
            aria-label={footerCollapsed ? "Déplier les boutons" : "Replier pour voir plus de plats"}
            className="absolute bottom-[calc(100%-4px)] left-1/2 flex h-[21px] w-[78px] -translate-x-1/2 items-end justify-center rounded-t-[16px] bg-white pb-0.5 shadow-[0_-4px_10px_rgba(43,42,40,0.06)] transition-transform active:scale-90"
          >
            <svg
              width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`translate-y-[2px] text-stone-400 transition-transform duration-200 ${footerCollapsed ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}
        <div
          className="grid"
          style={{
            gridTemplateRows: isCourseStep && footerCollapsed ? "0fr" : "1fr",
            transition: "grid-template-rows 300ms var(--ease-out)",
          }}
        >
          <div className="min-h-0 overflow-hidden pb-1.5">
            {launchError && (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-center text-sm font-bold text-red-700">{launchError}</p>
            )}
            {summary && (
              <p className="mb-2 translate-y-[2px] truncate text-center text-xs font-bold uppercase tracking-wide text-stone-500">{summary}</p>
            )}
            {isLast ? (
              selectedDishes.length > 0 ? (
                <button
                  type="button"
                  onClick={launchToCalendar}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] py-3.5 text-base font-extrabold text-white shadow-[0_4px_0_var(--primary-dark)] transition active:translate-y-[3px] active:scale-[0.99] active:shadow-[0_1px_0_var(--primary-dark)]"
                >
                  <Icon name="calendar" size={20} strokeWidth={2.2} /> Ajouter à ma semaine
                </button>
              ) : (
                <button type="button" disabled className="btn-3d btn-primary w-full py-3.5 text-base bg-[#f6b483] text-white/90 opacity-100 shadow-[0_4px_0_#dc9558]">
                  Choisis au moins un plat
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => goStep(step + 1)}
                disabled={!canContinue}
                className="btn-3d btn-primary w-full py-3.5 text-base disabled:bg-[#f6b483] disabled:text-white/90 disabled:opacity-100 disabled:shadow-[0_4px_0_#dc9558]"
              >
                {step === 0 ? "Composer le repas" : "Continuer"}
              </button>
            )}
            {isCourseStep && SKIP_LABEL[currentCourse] && (
              <button
                type="button"
                onClick={() => (isLast ? launchToCalendar() : goStep(step + 1))}
                className="mt-1.5 w-full py-1.5 text-sm font-bold text-stone-500 underline underline-offset-2 transition active:scale-95"
              >
                {SKIP_LABEL[currentCourse]}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const launch = launching ? (
    <div className="page-in fixed inset-0 z-[110] flex flex-col items-center justify-center gap-3 overflow-hidden bg-[var(--primary)]">
      <style>{`
        @keyframes mascot-launch { 0%{transform:translateY(60px) scale(.4) rotate(-10deg);opacity:0} 55%{transform:translateY(-14px) scale(1.08) rotate(4deg);opacity:1} 76%{transform:translateY(0) scale(.98) rotate(-1deg)} 100%{transform:translateY(0) scale(1) rotate(0deg)} }
        @keyframes mascot-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .mascot-launch { animation: mascot-launch .7s cubic-bezier(0.23,1,0.32,1) both, mascot-bob 1.1s ease-in-out .7s infinite; }
        @media (prefers-reduced-motion: reduce) { .mascot-launch { animation: none; } }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mascotte.png" alt="" className="mascot-launch h-44 w-44 object-contain" aria-hidden />
      <div className="pop text-3xl font-extrabold text-white">C&apos;est parti&nbsp;!</div>
      <div className="text-base font-bold text-white/85">Direction le calendrier…</div>
      <span className="cook-float text-3xl" style={{ left: "20%", bottom: "32%" }} aria-hidden>🔥</span>
      <span className="cook-float text-3xl" style={{ left: "50%", bottom: "26%", animationDelay: "0.3s" }} aria-hidden>🍳</span>
      <span className="cook-float text-3xl" style={{ left: "78%", bottom: "34%", animationDelay: "0.15s" }} aria-hidden>🥘</span>
    </div>
  ) : null;

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      {node}
      {launch}
      {/* Ask the appliance's brand then model when it's (re)selected. */}
      {detailModal && (
        <ApplianceModelPicker
          applianceKey={detailModal}
          initialValue={applianceDetail[detailModal]}
          onSave={(v) => {
            putDetail(detailModal, v);
            setDetailModal(null);
          }}
          onClose={() => setDetailModal(null)}
        />
      )}
      {mealLocked && <PremiumLockDialog feature="Voir tous les plats" onClose={() => setMealLocked(false)} />}
    </>,
    document.body,
  );
}

// A little stack of overlapping avatars for the people a chip is about (capped, with a +N overflow).
function ChipAvatars({ ids, memberById }: { ids: string[]; memberById: Map<string, Member> }) {
  if (ids.length === 0) return null;
  const shown = ids.slice(0, 3);
  const extra = ids.length - shown.length;
  return (
    <span className="mr-0.5 flex shrink-0 items-center">
      {shown.map((id, i) => {
        const m = memberById.get(id);
        if (!m) return null;
        return (
          <span key={id} className={`inline-flex rounded-full ring-1 ring-white ${i > 0 ? "-ml-1.5" : ""}`}>
            <Avatar person={m} size={18} />
          </span>
        );
      })}
      {extra > 0 && <span className="ml-0.5 text-[0.7rem] font-bold">+{extra}</span>}
    </span>
  );
}

const SECTION_TONE: Record<"green" | "stone" | "red", string> = {
  green: "text-green-700",
  stone: "text-stone-500",
  red: "text-red-700",
};

// A titled, collapsible group of dish cards. Starts open; the chevron on the right folds/unfolds it.
// `blurredFrom` is the index at/after which cards blur (the teaser): the list length blurs nothing,
// 0 blurs all (a locked secondary group).
function DishSection({
  title,
  tone,
  results,
  blurredFrom,
  selectedIds,
  onToggle,
  memberById,
  dinerCount,
  onBlockedTap,
}: {
  title: string;
  tone: "green" | "stone" | "red";
  results: DishResult[];
  blurredFrom: number;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  memberById: Map<string, Member>;
  dinerCount: number;
  onBlockedTap: () => void;
}) {
  const [open, setOpen] = useState(true);
  if (results.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          void haptic("light");
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className={`flex items-center gap-1.5 pl-0.5 text-sm font-extrabold ${SECTION_TONE[tone]}`}
      >
        <span>{title}</span>
        <span className="font-bold opacity-60">· {results.length}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          {results.map((r, i) => (
            <DishCard
              key={r.dish.id}
              result={r}
              index={i}
              selected={selectedIds.has(r.dish.id)}
              onToggle={onToggle}
              memberById={memberById}
              dinerCount={dinerCount}
              blurred={i >= blurredFrom}
              onBlockedTap={onBlockedTap}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DishCard({
  result,
  index,
  selected,
  onToggle,
  memberById,
  dinerCount,
  blurred = false,
  onBlockedTap,
}: {
  result: DishResult;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
  memberById: Map<string, Member>;
  dinerCount: number;
  blurred?: boolean;
  onBlockedTap?: () => void;
}) {
  const { dish, color } = result;
  const img = dishImage(dish.id);
  const chips = tasteChips(result, dinerCount);
  // Blurred (trial-lapsed teaser): the article stays tappable so the tap opens the offer, but its
  // CONTENTS are blurred via [&>*] and it can't be selected.
  const act = () => (blurred ? onBlockedTap?.() : onToggle(dish.id));
  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={blurred ? undefined : selected}
      onClick={act}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          act();
        }
      }}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={`card-in clay-card relative flex cursor-pointer items-stretch overflow-hidden border-2 transition-transform active:scale-[0.99] ${CARD[color]} ${
        selected && !blurred ? "ring-2 ring-[var(--primary)] ring-offset-2" : ""
      } ${blurred ? "select-none [&>*]:blur-[5px] [&>*]:saturate-[0.85]" : ""}`}
    >
      {/* Dish photo — square 1:1, flush to the left edge, full card height. Course emoji when a dish
          has no photo yet. */}
      {/* Dish photo, flush-left, full card height. Fixed width + self-stretch height is the reliable
          combo (WebKit collapses aspect-square that tries to derive width from a stretched height); the
          1:1 source fills the column via object-cover. Course emoji when a dish has no photo yet. */}
      {/* On a blurred teaser card the photo is blurred HARDER than the rest (inline filter overrides
          the card-wide [&>*] blur) — the appetising picture is the thing we most want to tease. */}
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className="w-[104px] shrink-0 self-stretch object-cover" style={blurred ? { filter: "blur(11px)" } : undefined} />
      ) : (
        <span
          aria-hidden
          className="flex w-[104px] shrink-0 self-stretch items-center justify-center bg-black/[0.04] text-4xl"
          style={blurred ? { filter: "blur(11px)" } : undefined}
        >
          {COURSE_EMOJI[dish.course] ?? "🍽️"}
        </span>
      )}

      {/* Cook time pinned to the card's top-right corner. */}
      <span className="absolute right-3 top-2.5 whitespace-nowrap text-xs font-semibold text-stone-400">
        ~{dish.cookMin}&nbsp;min
      </span>

      <div className="min-w-0 flex-1 py-4 pl-4 pr-2">
        {/* Title always on ONE line; small right pad keeps it clear of the corner cook-time. */}
        <div className="flex items-center gap-2 pr-6">
          <span className={`h-3 w-3 shrink-0 rounded-full ${DOT[color]}`} aria-hidden />
          <h3 className="min-w-0 flex-1 truncate text-lg font-bold leading-tight">{dish.name}</h3>
        </div>
        {/* Smart taste chips: avatars of the people concerned, then their names (or "Tout le monde"),
            then the ingredient, then the verdict emoji. Unrated ingredients get no chip; nothing to
            flag + everyone likes -> a single "Tout le monde aime". */}
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((c) => {
              const names = c.everyone
                ? "Tout le monde"
                : c.people.map((id) => memberById.get(id)?.name ?? "").filter(Boolean).join(", ");
              const food = c.foodId ? FOOD_BY_ID[c.foodId]?.label ?? "" : c.everyone ? "aime" : "";
              return (
                <span
                  key={c.key}
                  className={`flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-xs font-semibold ${VERDICT[c.verdict].chip} ${c.people.length === 0 ? "pl-2.5" : ""}`}
                >
                  <ChipAvatars ids={c.people} memberById={memberById} />
                  {names && <span className="font-bold">{names}</span>}
                  {food && <span>{food}</span>}
                  <span aria-hidden>{VERDICT[c.verdict].emoji}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Round check: orange ring, fills orange with a white tick when selected. Vertically centered. */}
      <span
        aria-hidden
        className={`mr-4 flex h-7 w-7 shrink-0 self-center items-center justify-center rounded-full border-2 border-[var(--primary)] transition-colors ${
          selected ? "bg-[var(--primary)]" : "bg-white"
        }`}
      >
        {selected && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
    </article>
  );
}
