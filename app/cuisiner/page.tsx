"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { DISHES } from "@/data/dishes";
import { RECIPES } from "@/data/recipes";
import { Icon } from "@/components/Icon";
import { PointsBurst, type Burst } from "@/components/PointsBurst";
import { apiFetch } from "@/lib/api";
import { haptic, useProgressHaptic } from "@/lib/native";
import { mealIngredients, scaleSteps, type CookIngredient } from "@/lib/recipe-qty";
import type { MealPlanEntry } from "@/lib/types";

// People this meal is cooked for — the same count the shopping list scales with (named diners + extra
// guests), so the recipe quantities below match the basket. Falls back to 2 when a meal has no diners.
function mealPeople(e: MealPlanEntry): number {
  return (e.diners?.length ?? 0) + (e.guests ?? 0) || 2;
}

const DISH_BY_ID = Object.fromEntries(DISHES.map((d) => [d.id, d]));
const EASE = [0.23, 1, 0.32, 1] as const;
const DONE_LS = "atable.cook.done";
const STEPS_LS = (date: string, slot: string) => `atable.cook.steps.${date}|${slot}`;

// Bonus for fully prepping a dish — a satisfying chunk-reward at a natural boundary.
const DISH_BONUS = 30;

type Phase = { entry: MealPlanEntry; name: string; cookMin: number; steps: string[]; tip?: string; people: number; ingredients: CookIngredient[] };

// Goal-gradient: the later a step sits in the whole session, the more it's worth (10 -> 50,
// convex ramp). The endgame pays out disproportionately, so the bar surges near the finish —
// the "so close, don't quit now" pull.
function stepPoints(globalIndex: number, total: number): number {
  if (total <= 1) return 50;
  const f = globalIndex / (total - 1);
  return Math.round((10 + 40 * Math.pow(f, 1.5)) / 5) * 5;
}
function tierFor(p: number): Burst["tier"] {
  return p >= 45 ? "mega" : p >= 30 ? "lg" : p >= 20 ? "md" : "sm";
}
function rewardPill(p: number): string {
  const t = tierFor(p);
  return t === "mega"
    ? "bg-amber-100 text-amber-700"
    : t === "lg"
      ? "bg-orange-100 text-orange-700"
      : t === "md"
        ? "bg-orange-50 text-orange-600"
        : "bg-emerald-50 text-emerald-600";
}

// Count toward a target from the previous value (live score in the sticky bar).
function useCountUp(target: number, reduce: boolean): number {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduce || from.current === target) {
      from.current = target;
      setVal(target);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    const dur = 480;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (target - start) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  return val;
}

// One-shot 0 -> value reveal for the finish tally.
function ScoreReveal({ value, reduce }: { value: number; reduce: boolean }) {
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    const t0 = performance.now();
    const dur = 950;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return <>{n}</>;
}

function CuisinerInner() {
  const params = useSearchParams();
  const router = useRouter();
  const date = params.get("date") || "";
  const slot = params.get("slot") || "";
  const reduce = !!useReducedMotion();

  const [entries, setEntries] = useState<MealPlanEntry[] | null>(null); // null = loading
  const [step, setStep] = useState(0); // current dish index; === phases.length -> finished
  const [checked, setChecked] = useState<Set<string>>(new Set()); // keys "di:si"
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seq = useRef(0);
  const prevPct = useRef(0);

  useEffect(() => {
    if (!date || !slot) {
      setEntries([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/meal-plan?from=${date}&to=${date}`);
        const data: MealPlanEntry[] = await res.json();
        if (alive) setEntries((Array.isArray(data) ? data : []).filter((e) => e.slot === slot));
      } catch {
        if (alive) setEntries([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [date, slot]);

  // Resume checked steps from a previous visit (Démarré reopens the same session).
  useEffect(() => {
    if (!date || !slot) return;
    try {
      const raw = localStorage.getItem(STEPS_LS(date, slot));
      if (raw) setChecked(new Set<string>(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, [date, slot]);

  useEffect(() => {
    if (!date || !slot) return;
    try {
      localStorage.setItem(STEPS_LS(date, slot), JSON.stringify([...checked]));
    } catch {
      /* ignore */
    }
  }, [checked, date, slot]);

  // The plan: start the longest-cooking dish first, and precompute per-step points.
  const { phases, pts, totalPoints } = useMemo(() => {
    const list: Phase[] = [];
    if (entries) {
      for (const e of entries) {
        const dish = DISH_BY_ID[e.dishId];
        if (!dish) continue;
        const recipe = RECIPES[e.dishId];
        const people = mealPeople(e);
        // Scale the step amounts + build the ingredient list for this meal's people, coherent with the
        // basket. Step COUNT is unchanged, so the points system below is unaffected.
        list.push({
          entry: e,
          name: e.dishName,
          cookMin: dish.cookMin,
          steps: scaleSteps(recipe?.steps ?? [], e.dishId, people),
          tip: recipe?.tip,
          people,
          ingredients: mealIngredients(e.dishId, people),
        });
      }
      list.sort((a, b) => b.cookMin - a.cookMin);
    }
    const totalSteps = list.reduce((n, p) => n + p.steps.length, 0);
    let g = 0;
    const points: number[][] = [];
    for (const p of list) {
      const row: number[] = [];
      for (let i = 0; i < p.steps.length; i++) row.push(stepPoints(g++, totalSteps));
      points.push(row);
    }
    const stepTotal = points.reduce((n, row) => n + row.reduce((a, b) => a + b, 0), 0);
    return { phases: list, pts: points, totalPoints: stepTotal + DISH_BONUS * list.length };
  }, [entries]);

  const earned = useMemo(() => {
    let sum = 0;
    phases.forEach((p, di) => {
      let all = p.steps.length > 0;
      p.steps.forEach((_, si) => {
        if (checked.has(`${di}:${si}`)) sum += pts[di][si];
        else all = false;
      });
      if (all) sum += DISH_BONUS;
    });
    return sum;
  }, [checked, phases, pts]);

  const finished = phases.length > 0 && step >= phases.length;
  const current = phases[Math.min(step, Math.max(0, phases.length - 1))];
  const pct = totalPoints ? Math.min(100, Math.round((earned / totalPoints) * 100)) : 0;
  const perfect = pct >= 100;
  const scoreDisplay = useCountUp(earned, reduce);
  // A light haptic every time the score bar climbs (each step, plus the dish-done bonus).
  useProgressHaptic(earned);

  const dishDone =
    !!current && current.steps.length > 0 && current.steps.every((_, k) => checked.has(`${step}:${k}`));
  const remainingInDish = current ? current.steps.filter((_, k) => !checked.has(`${step}:${k}`)).length : 0;

  // Half-way milestone: a one-off gold badge + a nudge from the mascot.
  useEffect(() => {
    if (prevPct.current < 50 && pct >= 50 && pct < 100) {
      const id = ++seq.current;
      setBursts((b) => [...b.slice(-8), { id, points: 0, tier: "mega", label: "MI-PARCOURS", x: 0 }]);
    }
    prevPct.current = pct;
  }, [pct]);

  const bubbleText =
    entries === null
      ? "On prépare ta session cuisine…"
      : phases.length === 0
        ? "Rien à cuisiner pour ce repas."
        : finished
          ? "Tout est prêt, bravo ! À table 🎉"
          : perfect
            ? "Tout est prêt — clique sur J'ai fini ! 🎉"
            : pct >= 50
              ? `Plus que ${Math.max(0, totalPoints - earned)} pts, tu y es presque ! 🔥`
              : dishDone
                ? "Plat prêt ! Passe au suivant 👉"
                : phases.length > 1 && step === 0 && earned === 0
                  ? `${phases.length} plats — on commence par le plus long, coche chaque étape ⚡`
                  : `${current?.name} — coche les étapes pour gagner des points ⚡`;

  const back = () => (window.history.length > 1 ? router.back() : router.push("/semaine"));

  function scrollTop() {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }
  function goStep(n: number) {
    setStep(n);
    scrollTop();
  }
  function spawn(points: number, tier: Burst["tier"], label?: string) {
    const id = ++seq.current;
    const x = Math.round((Math.random() * 2 - 1) * 92);
    setBursts((b) => [...b.slice(-8), { id, points, tier, label, x }]);
  }
  function removeBurst(id: number) {
    setBursts((b) => b.filter((x) => x.id !== id));
  }

  function toggleStep(di: number, si: number) {
    const key = `${di}:${si}`;
    const was = checked.has(key);
    const next = new Set(checked);
    if (was) next.delete(key);
    else next.add(key);
    setChecked(next);
    if (was) return; // celebrate on check only

    const p = pts[di]?.[si] ?? 10;
    spawn(p, tierFor(p));
    // Native haptic comes from useProgressHaptic(earned) (the score bar climbing). Keep the web
    // vibrate for Android PWA where that hook's Capacitor haptic is a no-op.
    try {
      navigator.vibrate?.(tierFor(p) === "mega" ? 26 : 11);
    } catch {
      /* no-op */
    }

    const dishSteps = phases[di].steps;
    const nowAll = dishSteps.length > 0 && dishSteps.every((_, k) => next.has(`${di}:${k}`));
    const wasAll = dishSteps.length > 0 && dishSteps.every((_, k) => checked.has(`${di}:${k}`));
    if (nowAll && !wasAll) {
      window.setTimeout(() => spawn(DISH_BONUS, "mega", "PLAT PRÊT"), 250);
      void haptic("success");
      try {
        navigator.vibrate?.([0, 16, 40, 16]);
      } catch {
        /* no-op */
      }
    }
  }

  function markFinished() {
    try {
      const raw = localStorage.getItem(DONE_LS);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      set.add(`${date}|${slot}`);
      localStorage.setItem(DONE_LS, JSON.stringify([...set]));
    } catch {
      /* ignore */
    }
    setStep(phases.length);
    scrollTop();
  }

  return (
    <main className="mx-auto -mt-5 w-full max-w-lg px-4 pb-24 pt-[calc(env(safe-area-inset-top)+8px)] md:mt-0 md:pt-3">
      <PointsBurst bursts={bursts} onDone={removeBurst} />

      {/* One line: plain grey back chevron (no white circle — the generic back bar is gone for this
          route), then the mascot + speech bubble. */}
      <div className="mb-3 flex items-start gap-2">
        <button
          type="button"
          onClick={back}
          aria-label="Retour"
          className="mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition active:scale-90"
        >
          <Icon name="chevron-left" size={24} strokeWidth={2.5} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-14 w-14 shrink-0 object-contain" />
        <div className="relative mt-1 rounded-2xl bg-white px-4 py-2.5 text-[15px] font-extrabold leading-snug text-stone-800 shadow-[0_6px_20px_rgba(43,42,40,0.14)]">
          {bubbleText}
          <span className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 bg-white" aria-hidden />
        </div>
      </div>

      {/* Sticky progress bar — driven by POINTS, with a live count-up score. Pins right under the
          notch when the mascot row scrolls away. */}
      {phases.length > 0 && (
        <div className="sticky top-[env(safe-area-inset-top)] z-10 -mx-4 mb-4 rounded-b-3xl border-b-2 border-stone-100 bg-[var(--background)] px-4 py-2.5 md:top-[calc(var(--header-h)-25px)]">
          <div className="mb-1.5 flex items-center justify-between text-sm font-extrabold">
            <span className="flex items-center gap-1 text-stone-700">
              <Icon name="zap" size={15} className="text-[var(--primary)]" />
              <span className="tabular-nums">{scoreDisplay}</span> pts
            </span>
            <span className="text-[var(--primary)]">{pct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--primary-soft)]">
            <motion.div
              className="h-full rounded-full bg-[var(--primary)]"
              initial={false}
              animate={{ width: `${Math.max(4, pct)}%` }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 30 }}
            />
          </div>
        </div>
      )}

      {entries === null ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      ) : phases.length === 0 ? (
        <div className="clay-card flex flex-col items-center gap-3 border-2 border-stone-100 p-8 text-center">
          <span className="text-5xl" aria-hidden>
            🍽️
          </span>
          <p className="font-bold text-stone-800">Rien à cuisiner ici</p>
          <button type="button" onClick={() => router.push("/semaine")} className="btn-3d btn-primary mt-1 rounded-full px-5 py-2.5 text-sm">
            Retour au calendrier
          </button>
        </div>
      ) : finished ? (
        <motion.div
          className="clay-card mt-2 flex flex-col items-center gap-2 border-2 border-green-200 bg-green-50 p-6 text-center"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <motion.img
            src="/mascotte.png"
            alt=""
            aria-hidden
            className="h-24 w-24 object-contain"
            initial={reduce ? false : { rotate: -12, scale: 0.8 }}
            animate={{ rotate: [-12, 8, 0], scale: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
          />
          <p className="text-xl font-extrabold text-green-800">Tout est prêt, à&nbsp;table&nbsp;!</p>

          <div className="mt-1 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <Icon name="trophy" size={20} className="text-[var(--gold)]" strokeWidth={2.4} />
            <span className="text-lg font-black tabular-nums text-stone-800">
              <ScoreReveal value={earned} reduce={reduce} /> pts
            </span>
          </div>
          {perfect && (
            <p className="flex items-center gap-1 text-sm font-extrabold text-amber-600">
              <Icon name="star" size={15} className="text-[var(--gold)]" /> Score parfait, chapeau&nbsp;!
            </p>
          )}

          <button type="button" onClick={() => router.push("/semaine")} className="btn-3d btn-primary mt-2 rounded-full px-6 py-3 text-base">
            Retour au calendrier
          </button>
        </motion.div>
      ) : (
        <>
          {/* Order overview — only before you start cooking (step 0). */}
          {step === 0 && phases.length > 1 && (
            <motion.div
              className="clay-card mb-4 border-2 border-[var(--primary)]/20 bg-[var(--primary-soft)]/50 p-4"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold text-stone-800">Ordre conseillé pour tout servir ensemble</p>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
                  <Icon name="zap" size={12} /> {totalPoints} pts
                </span>
              </div>
              <ol className="mt-2 flex flex-col gap-1">
                {phases.map((p, i) => (
                  <li key={p.entry.dishId} className="flex items-center gap-2 text-sm font-bold text-stone-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[11px] font-extrabold text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 text-xs text-stone-400">~{p.cookMin}&nbsp;min</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          )}

          {/* Current dish card */}
          <motion.section
            key={current.entry.dishId}
            className="clay-card border-2 border-stone-100 bg-white p-4"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.34, ease: EASE }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-extrabold text-white">{step + 1}</span>
              <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold text-stone-900">{current.name}</h2>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-stone-500 shadow-sm">~{current.cookMin}&nbsp;min</span>
            </div>

            {/* Ingredients for THIS meal's people — computed from the same engine as the shopping list,
                so what you buy and what you cook always match, and both scale with the diners. */}
            {current.ingredients.length > 0 && (
              <div className="mb-3 rounded-xl bg-[var(--primary-soft)]/50 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-[var(--primary)]">
                  <Icon name="shopping-cart" size={13} strokeWidth={2.4} />
                  Ingrédients · pour {current.people}&nbsp;{current.people > 1 ? "personnes" : "personne"}
                </p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {current.ingredients.map((ing) => (
                    <li key={ing.foodId} className="text-[13px] font-semibold text-stone-600">
                      {ing.label} <span className="font-extrabold text-stone-900">{ing.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {current.steps.length === 0 ? (
              <p className="text-sm font-semibold text-stone-400">Pas d&apos;étapes pour ce plat.</p>
            ) : (
              <ol className="flex flex-col gap-1">
                {current.steps.map((s, i) => {
                  const done = checked.has(`${step}:${i}`);
                  const p = pts[step]?.[i] ?? 10;
                  return (
                    <motion.li
                      key={i}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduce ? 0 : 0.08 + i * 0.05, duration: 0.3, ease: EASE }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleStep(step, i)}
                        aria-pressed={done}
                        data-haptic="off"
                        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition active:scale-[0.99]"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            done ? "border-transparent bg-[var(--ok)] text-white" : "border-stone-300 bg-white text-transparent"
                          }`}
                        >
                          <motion.span
                            initial={false}
                            animate={{ scale: done ? 1 : 0 }}
                            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 20 }}
                          >
                            <Icon name="check" size={16} strokeWidth={3.5} />
                          </motion.span>
                        </span>
                        <p
                          className={`min-w-0 flex-1 text-[15px] font-semibold leading-snug transition-colors ${
                            done ? "text-stone-400 line-through" : "text-stone-800"
                          }`}
                        >
                          {s}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black tabular-nums transition ${
                            done ? "bg-stone-100 text-stone-300 line-through" : rewardPill(p)
                          }`}
                        >
                          +{p}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </ol>
            )}

            {current.tip && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2">
                <Icon name="lightbulb" size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-amber-500" />
                <p className="text-[13px] font-semibold leading-snug text-amber-900">{current.tip}</p>
              </div>
            )}

            {current.steps.length > 0 && (
              <p className="mt-3 text-center text-xs font-bold text-stone-400">
                {dishDone ? "Plat prêt ✓" : `${remainingInDish} étape${remainingInDish > 1 ? "s" : ""} à cocher`}
              </p>
            )}
          </motion.section>

          {/* Nav */}
          <div className="mt-4 flex items-stretch gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => goStep(step - 1)}
                aria-label="Plat précédent"
                className="btn-3d btn-neutral flex shrink-0 items-center justify-center px-4 py-3.5"
              >
                <Icon name="chevron-left" size={20} strokeWidth={2.6} />
              </button>
            )}
            {step < phases.length - 1 ? (
              <button
                type="button"
                onClick={() => goStep(step + 1)}
                className={`btn-3d btn-primary flex flex-1 items-center justify-center gap-1.5 py-3.5 text-base ${dishDone && !reduce ? "qm-pulse" : ""}`}
              >
                Continuer <Icon name="chevron-right" size={20} strokeWidth={2.6} />
              </button>
            ) : (
              <button
                type="button"
                onClick={markFinished}
                className={`flex flex-1 items-center justify-center gap-2 rounded-btn bg-[var(--ok)] py-3.5 text-base font-extrabold text-white transition active:scale-[0.98] ${perfect && !reduce ? "qm-pulse" : ""}`}
                style={{ boxShadow: "0 4px 0 #15803d" }}
              >
                <Icon name="check" size={19} strokeWidth={3} /> J&apos;ai fini&nbsp;!
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}

export default function CuisinerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold text-stone-400">Chargement…</div>}>
      <CuisinerInner />
    </Suspense>
  );
}
