"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DISHES } from "@/data/dishes";
import { CookButton } from "@/components/CookButton";
import { PremiumLockDialog, usePremium } from "@/components/PremiumGate";
import { RecipeSheet } from "@/components/RecipeSheet";
import { dishImage } from "@/data/dish-images";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { apiFetch } from "@/lib/api";
import { haptic } from "@/lib/native";
import { useFamily } from "@/components/ProfileProvider";
import { weekRangeLabel, weekOffsetOfDate } from "@/lib/week";
import type { MealPlanEntry, Slot } from "@/lib/types";

const DISH_BY_ID = Object.fromEntries(DISHES.map((d) => [d.id, d]));

// Meal slots. Lunch reads as a warm daylight moment, dinner as a calm evening one — a small colored
// sun/moon badge helps a busy cook scan the week at a glance (the brand orange stays for CTAs/today).
const SLOTS: { id: Slot; label: string; icon: string; badge: string; card: string }[] = [
  { id: "midi", label: "Midi", icon: "sun", badge: "bg-amber-200 text-amber-700", card: "border-amber-200 bg-amber-50" },
  { id: "soir", label: "Soir", icon: "moon", badge: "bg-indigo-200 text-indigo-700", card: "border-indigo-200 bg-indigo-50" },
];

const COURSE_EMOJI: Record<string, string> = {
  entree: "🥗",
  plat: "🍲",
  dessert: "🍰",
};
const COURSE_RANK: Record<string, number> = { entree: 0, plat: 1, dessert: 2 };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const weekdayName = (d: Date) => cap(new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(d));
const monthName = (d: Date) => cap(new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(d));

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function mondayOf(offsetWeeks: number): Date {
  const now = new Date();
  const diffToMon = (now.getDay() + 6) % 7; // 0=Sun..6=Sat -> days since Monday
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon + offsetWeeks * 7);
}

function key(date: string, slot: Slot) {
  return `${date}|${slot}`;
}

// Auto-center-on-today fires only on the FIRST calendar mount of the JS session — i.e. the cold
// launch / landing (start_url is "/semaine"). Module-level so it survives client navigations (which
// must NOT recenter — they land normally at the top) and resets on a full reload / fresh PWA launch.
// The "Aujourd'hui" button still recenters on demand (it re-arms pendingCenter directly).
let coldCenterDone = false;

export default function SemainePage() {
  const { members } = useFamily();
  const membersById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  // ?focus=YYYY-MM-DD_slot: the meal just added from the wizard — land on its week and centre its day.
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");
  const focusYmd = focusParam ? focusParam.split("_")[0] : null;
  const focusOffset = focusYmd ? Math.max(-12, Math.min(2, weekOffsetOfDate(focusYmd))) : null;
  const [offset, setOffset] = useState(focusOffset ?? 0);
  const [plan, setPlan] = useState<Record<string, MealPlanEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState<Set<string>>(new Set());
  const [planError, setPlanError] = useState("");
  const [recipeDishId, setRecipeDishId] = useState<string | null>(null);
  const [cookLocked, setCookLocked] = useState(false);
  const cookAllowed = usePremium();
  const [recipePeople, setRecipePeople] = useState(2); // diners of the tapped meal, so the sheet scales like the basket
  const [guestEdit, setGuestEdit] = useState<string | null>(null); // key(date,slot) whose adults stepper is open
  const router = useRouter();
  // Cooking is premium once the trial lapses. Intercepted HERE rather than blurring the calendar:
  // the week itself stays free, only the door to the cook session is locked.
  const goCook = (date: string, slot: string) => {
    if (!cookAllowed) return setCookLocked(true);
    router.push(`/cuisiner?date=${date}&slot=${slot}`);
  };

  // "Démarré" / "Terminé" survive reloads (started here, finished from the cook session).
  useEffect(() => {
    const load = () => {
      try {
        const s = localStorage.getItem("atable.cook.started");
        setStarted(s ? new Set<string>(JSON.parse(s)) : new Set());
        const f = localStorage.getItem("atable.cook.done");
        setFinished(f ? new Set<string>(JSON.parse(f)) : new Set());
      } catch {
        /* ignore */
      }
    };
    load();
    // Re-read when coming back from the cook session (finished may have changed).
    window.addEventListener("visibilitychange", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("visibilitychange", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  const todayRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null); // the day card of ?focus, if any
  // A ?focus landing must centre even if we've already cold-centered once this session.
  const pendingCenter = useRef(!coldCenterDone || !!focusYmd);

  // Scroll a day card to the middle of the screen. Manual calc (not scrollIntoView,
  // which can land at the top while the layout is still settling).
  function centerOn(el: HTMLElement | null, behavior: ScrollBehavior) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = rect.top + window.scrollY - window.innerHeight / 2 + rect.height / 2;
    window.scrollTo({ top: Math.max(0, y), behavior });
  }
  function centerToday(behavior: ScrollBehavior) {
    centerOn(todayRef.current, behavior);
  }

  // "Aujourd'hui": jump to this week AND recentre on today (even if already this week).
  function goToday() {
    pendingCenter.current = true;
    if (offset === 0) {
      requestAnimationFrame(() => {
        pendingCenter.current = false;
        centerToday("smooth");
      });
    } else {
      setOffset(0); // triggers a reload; the effect recentres once the week is in
    }
  }

  const monday = useMemo(() => mondayOf(offset), [offset]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        return { date: d, ymd: ymd(d) };
      }),
    [monday],
  );
  const todayYmd = useMemo(() => ymd(new Date()), []);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/meal-plan?from=${days[0].ymd}&to=${days[6].ymd}`);
      const data: MealPlanEntry[] = await res.json();
      const map: Record<string, MealPlanEntry[]> = {};
      for (const e of Array.isArray(data) ? data : []) (map[key(e.date, e.slot)] ??= []).push(e);
      setPlan(map);
    } catch {
      setPlan({});
    } finally {
      setLoading(false);
    }
    // Once THIS week's data is in and painted, recentre today if requested — done here
    // (not in a [loading] effect) so a jump from another week centres AFTER the reload,
    // not on the stale render before it.
    if (pendingCenter.current) {
      // A ?focus landing centres the added meal's day; a plain landing centres today.
      if (focusYmd && offset === focusOffset) {
        pendingCenter.current = false;
        coldCenterDone = true;
        requestAnimationFrame(() => requestAnimationFrame(() => centerOn(focusRef.current, "auto")));
      } else if (!focusYmd && offset === 0) {
        pendingCenter.current = false;
        coldCenterDone = true; // the landing has centered; later nav mounts skip it (stay at top)
        requestAnimationFrame(() => requestAnimationFrame(() => centerToday("auto")));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, offset]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  // Show a transient error and roll the optimistic change back so the UI never
  // claims something was saved when it was not.
  function flashError(msg: string) {
    setPlanError(msg);
    setTimeout(() => setPlanError(""), 4000);
  }

  async function removeDish(date: string, slot: Slot, dishId: string) {
    void haptic("medium"); // delete = a firmer buzz than a plain tap
    const k = key(date, slot);
    const removed = (plan[k] ?? []).find((e) => e.dishId === dishId);
    setPlan((prev) => ({ ...prev, [k]: (prev[k] ?? []).filter((e) => e.dishId !== dishId) }));
    try {
      const res = await apiFetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "remove", date, slot, dishId }),
      });
      if (!res.ok) throw new Error("save_failed");
    } catch {
      if (removed) {
        setPlan((prev) => ({
          ...prev,
          [k]: [...(prev[k] ?? []), removed].sort((a, b) => COURSE_RANK[a.course] - COURSE_RANK[b.course]),
        }));
      }
      flashError("Plat pas retiré, réessaie.");
    }
  }

  // Set the "extra adults" (guests) for a whole meal slot — optimistic, rolls back on failure.
  async function changeGuests(date: string, slot: Slot, nextGuests: number) {
    const k = key(date, slot);
    const clamped = Math.max(0, Math.min(20, nextGuests));
    const prevEntries = plan[k] ?? [];
    setPlan((prev) => ({ ...prev, [k]: (prev[k] ?? []).map((e) => ({ ...e, guests: clamped })) }));
    try {
      const res = await apiFetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "guests", date, slot, guests: clamped }),
      });
      if (!res.ok) throw new Error("save_failed");
    } catch {
      setPlan((prev) => ({ ...prev, [k]: prevEntries }));
      flashError("Invités pas enregistrés, réessaie.");
    }
  }

  async function startSlot(date: string, slot: Slot, entries: MealPlanEntry[]) {
    const k = key(date, slot);
    setStarted((prev) => {
      const next = new Set(prev).add(k);
      try {
        localStorage.setItem("atable.cook.started", JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
    try {
      const responses = await Promise.all(
        entries.map((e) =>
          apiFetch("/api/meal-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dishId: e.dishId, dishName: e.dishName, course: e.course, diners: [] }),
          }),
        ),
      );
      if (responses.some((r) => !r.ok)) throw new Error("save_failed");
    } catch {
      setStarted((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
      flashError("Repas pas démarré, réessaie.");
    }
  }

  const rangeLabel = weekRangeLabel(ymd(days[0].date), ymd(days[6].date));

  // A slot's people (adults/children from the meal's diners) + its longest cook time.
  function mealInfo(entries: MealPlanEntry[]) {
    const ids = new Set<string>();
    for (const e of entries) for (const id of e.diners ?? []) ids.add(id);
    let adults = 0;
    let kids = 0;
    for (const id of ids) {
      const m = membersById[id];
      if (!m) continue;
      if (m.isChild) kids++;
      else adults++;
    }
    // "Extra adults" (guests) are uniform across a slot's dishes — take the slot value and add it to
    // the named adult diners for the total shown; the stepper adjusts the guests part.
    const guests = entries.reduce((mx, e) => Math.max(mx, e.guests ?? 0), 0);
    const totalAdults = adults + guests;
    const parts: string[] = [];
    if (totalAdults) parts.push(`${totalAdults} adulte${totalAdults > 1 ? "s" : ""}`);
    if (kids) parts.push(`${kids} enfant${kids > 1 ? "s" : ""}`);
    const minutes = entries.reduce((mx, e) => Math.max(mx, DISH_BY_ID[e.dishId]?.cookMin ?? 0), 0);
    return { people: parts.join(", "), minutes, guests, totalAdults };
  }

  return (
    <div className="flex flex-col gap-5">
      {planError && (
        <div className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] flex justify-center px-4 print:hidden">
          <p className="rounded-xl bg-red-600 px-4 py-2 text-center text-sm font-bold text-white shadow-lg">
            {planError}
          </p>
        </div>
      )}
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Le calendrier</h1>
        <p className="mt-1 text-stone-600">
          Compose tes repas de la semaine. Le jour J, lance «&nbsp;Démarrer&nbsp;» pour l&apos;ajouter à l&apos;historique.
        </p>
      </section>

      {/* Week navigator card; the smaller "Aujourd'hui" (jump back to this week + recentre today) sits below it. */}
      <div className="flex flex-col gap-2.5">
        <div className="clay-card flex items-center gap-2 border-2 border-stone-100 p-1.5">
          {/* Planning window = this week + the next 2 (offset 0..2), whole weeks only, no past. That
              covers "~14 days ahead" rounded up to full Monday→Sunday weeks. */}
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(-12, o - 1))}
            disabled={offset <= -12}
            aria-label="Semaine précédente"
            className="btn-3d btn-neutral flex h-12 w-12 shrink-0 items-center justify-center rounded-full disabled:pointer-events-none disabled:opacity-30"
          >
            <Icon name="chevron-left" size={24} strokeWidth={2.6} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-lg font-extrabold text-stone-900">{offset === 0 ? "Cette semaine" : rangeLabel}</div>
            {offset === 0 && <div className="truncate text-xs font-bold text-stone-400">{rangeLabel}</div>}
          </div>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(2, o + 1))}
            disabled={offset >= 2}
            aria-label="Semaine suivante"
            className="btn-3d btn-neutral flex h-12 w-12 shrink-0 items-center justify-center rounded-full disabled:pointer-events-none disabled:opacity-30"
          >
            <Icon name="chevron-right" size={24} strokeWidth={2.6} />
          </button>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="btn-3d btn-neutral mx-auto flex items-center gap-1.5 rounded-full px-4 py-2 text-sm active:border-[var(--primary)] active:bg-[var(--primary)] active:text-white"
        >
          <Icon name="calendar" size={16} strokeWidth={2.2} /> Aujourd&apos;hui
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day, i) => {
            const isToday = day.ymd === todayYmd;
            const dayCount = SLOTS.reduce((n, s) => n + (plan[key(day.ymd, s.id)]?.length ?? 0), 0);
            return (
              <div
                key={day.ymd}
                ref={day.ymd === focusYmd ? focusRef : isToday ? todayRef : undefined}
                style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}
                className={`card-in clay-card scroll-mt-[var(--header-h)] border-2 p-3 ${
                  isToday ? "border-[var(--primary)] ring-4 ring-[var(--primary-soft)]" : "border-stone-100"
                }`}
              >
                {/* Day header: a calendar-tile date + weekday + month; today gets the orange treatment. */}
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[1.35rem] font-extrabold leading-none ${
                      isToday ? "bg-[var(--primary)] text-white shadow-[0_2px_0_var(--primary-dark)]" : "bg-stone-100 text-stone-800"
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-extrabold leading-tight text-stone-900">{weekdayName(day.date)}</div>
                    <div className="text-sm font-bold text-stone-500">{monthName(day.date)}</div>
                  </div>
                  {isToday ? (
                    <span className="pop shrink-0 rounded-full bg-[var(--primary)] px-3 py-1 text-[13px] font-extrabold text-white">Aujourd&apos;hui</span>
                  ) : dayCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-[13px] font-bold text-stone-600">
                      {dayCount} plat{dayCount > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {SLOTS.map((s) => {
                    const entries = plan[key(day.ymd, s.id)] ?? [];
                    const isStarted = started.has(key(day.ymd, s.id));
                    const isFinished = finished.has(key(day.ymd, s.id));
                    const info = entries.length ? mealInfo(entries) : null;
                    return (
                      <div key={s.id} className={`flex flex-col rounded-2xl border-2 p-2.5 ${s.card}`}>
                        <div className="mb-2.5 flex items-center gap-2">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.badge}`}>
                            <Icon name={s.icon} size={18} strokeWidth={2.4} />
                          </span>
                          <span className="text-base font-extrabold text-stone-800">{s.label}</span>
                        </div>
                        {entries.length > 0 ? (
                          <ul className="mb-2 flex flex-col gap-1.5">
                            {entries.map((e) => (
                              <li key={e.dishId} className="flex items-center gap-1 rounded-xl bg-white shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecipeDishId(e.dishId);
                                    setRecipePeople((e.diners?.length ?? 0) + (e.guests ?? 0) || 2);
                                  }}
                                  aria-label={`Voir la recette : ${e.dishName}`}
                                  className="flex min-w-0 flex-1 items-center gap-2 rounded-l-xl py-1.5 pl-2.5 pr-1 text-left transition active:scale-[0.98]"
                                >
                                  {dishImage(e.dishId) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={dishImage(e.dishId)!} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover shadow-sm" />
                                  ) : (
                                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center text-lg leading-none">{COURSE_EMOJI[e.course] ?? "🍽️"}</span>
                                  )}
                                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-stone-800">{e.dishName}</span>
                                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--primary-soft)] py-1 pl-2 pr-2.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--primary)]">
                                    <Icon name="book" size={13} strokeWidth={2.4} /> Recette
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeDish(day.ymd, s.id, e.dishId)}
                                  aria-label={`Retirer ${e.dishName}`}
                                  className="mr-1 shrink-0 rounded-full p-1 text-red-500 transition hover:bg-red-50 active:scale-90"
                                >
                                  <Icon name="trash" size={16} strokeWidth={2} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mb-2 py-1.5 text-center text-sm font-bold text-stone-400">Rien de prévu</p>
                        )}
                        {info && (
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            {guestEdit === key(day.ymd, s.id) ? (
                              // −N+ stepper (same look as the shopping list) to add/remove extra adults.
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-1.5 py-0.5 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => changeGuests(day.ymd, s.id, info.guests - 1)}
                                  disabled={info.guests <= 0}
                                  aria-label="Un adulte de moins"
                                  className={`flex h-7 w-7 items-center justify-center rounded-full text-lg font-extrabold leading-none transition active:scale-90 ${info.guests > 0 ? "bg-stone-600 text-stone-100" : "bg-stone-100 text-stone-300"}`}
                                >
                                  −
                                </button>
                                <span className="min-w-[3.75rem] text-center text-xs font-extrabold text-stone-800">
                                  {info.totalAdults} adulte{info.totalAdults > 1 ? "s" : ""}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => changeGuests(day.ymd, s.id, info.guests + 1)}
                                  disabled={info.guests >= 20}
                                  aria-label="Un adulte de plus"
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-extrabold leading-none text-white transition active:scale-90 disabled:opacity-40"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setGuestEdit(null)}
                                  aria-label="Terminé"
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white transition active:scale-90"
                                >
                                  <Icon name="check" size={16} strokeWidth={3} />
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setGuestEdit(key(day.ymd, s.id))}
                                aria-label="Modifier le nombre d'adultes"
                                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm transition active:scale-95"
                              >
                                <Icon name="users" size={14} strokeWidth={2.2} /> {info.people || "Adultes"}
                                <Icon name="edit" size={11} strokeWidth={2.4} className="text-stone-400" />
                              </button>
                            )}
                            {info.minutes > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-stone-600 shadow-sm">
                                <Icon name="clock" size={14} strokeWidth={2.2} /> ~{info.minutes}&nbsp;min
                              </span>
                            )}
                          </div>
                        )}
                        {/* Composing happens in Repas: jump there with the day + slot preselected. */}
                        <div className="mt-auto flex flex-col gap-2 pt-0.5">
                          <Link
                            href={`/?date=${day.ymd}&slot=${s.id}`}
                            className="flex items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-[var(--primary)]/45 bg-[var(--primary-soft)]/40 py-2.5 text-sm font-extrabold text-[var(--primary)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] active:scale-[0.97]"
                          >
                            <Icon name="plus-circle" size={18} strokeWidth={2.2} /> Ajouter un repas
                          </Link>
                          {entries.length > 0 && (
                            <CookButton fullWidth compact holdHint label="Commencer ma cuisine" icon="play" emoji="" onComplete={() => { if (!cookAllowed) return setCookLocked(true); startSlot(day.ymd, s.id, entries); goCook(day.ymd, s.id); }} onDoneClick={() => goCook(day.ymd, s.id)} done={isStarted || isFinished} doneLabel={isFinished ? "Terminé !" : "Démarré ✓"} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RecipeSheet dishId={recipeDishId} people={recipePeople} onClose={() => setRecipeDishId(null)} />
      {cookLocked && <PremiumLockDialog feature="Le mode cuisine" onClose={() => setCookLocked(false)} />}
    </div>
  );
}
