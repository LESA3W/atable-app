"use client";

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect } from "react";
import { DISHES } from "@/data/dishes";
import { RECIPES } from "@/data/recipes";
import { dishImage } from "@/data/dish-images";
import { Icon } from "@/components/Icon";
import { PremiumGate } from "@/components/PremiumGate";
import { mealIngredients, scaleSteps } from "@/lib/recipe-qty";

const COURSE_LABEL: Record<string, string> = { entree: "Entrée", plat: "Plat", dessert: "Dessert" };

// Tap a dish in the calendar -> this bottom sheet slides up with its step-by-step recipe.
// Motion follows the emil playbook: slide from translateY(100%) with an iOS drawer curve, a fading
// scrim, staggered step reveals, drag-to-dismiss with velocity, and a reduced-motion fallback.
// `people` = the meal's diners; the ingredient list + the amounts in the steps scale to it (and match
// the shopping list). Defaults to 2 when opened without a known meal.
export function RecipeSheet({ dishId, people = 2, onClose }: { dishId: string | null; people?: number; onClose: () => void }) {
  const reduce = useReducedMotion();
  const dish = dishId ? DISHES.find((d) => d.id === dishId) : null;
  const recipe = dishId ? RECIPES[dishId] : undefined;
  const img = dish ? dishImage(dish.id) : null;
  const steps = recipe && dishId ? scaleSteps(recipe.steps, dishId, people) : [];
  const ingredients = dishId ? mealIngredients(dishId, people) : [];

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!dishId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [dishId, onClose]);

  const drawer = { type: "tween" as const, duration: 0.42, ease: [0.32, 0.72, 0, 1] as const };

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 130 || info.velocity.y > 650) onClose();
  }

  return (
    <AnimatePresence>
      {dishId && dish && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[100] bg-stone-900/45"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />

          <motion.section
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Recette : ${dish.name}`}
            className="fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-[var(--background)] shadow-[0_-12px_40px_rgba(43,42,40,0.28)]"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={drawer}
            drag={reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={onDragEnd}
          >
            {/* Grab handle */}
            <div className="flex shrink-0 cursor-grab justify-center pb-1 pt-2.5 active:cursor-grabbing">
              <span aria-hidden className="h-1.5 w-11 rounded-full bg-stone-300" />
            </div>

            {/* Photo + ingredients + steps are premium once the trial lapses. The sheet chrome
                (handle, drag-to-dismiss, scrim) stays live so it can always be closed. */}
            <PremiumGate feature="Les recettes">
            {/* Hero photo (dishes that have one; graceful when missing). */}
            {img && (
              <div className="shrink-0 px-4 pb-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={dish.name}
                  className="h-44 w-full rounded-2xl object-cover shadow-[0_6px_18px_rgba(43,42,40,0.12)]"
                />
              </div>
            )}

            {/* Header: dish + course + time, with a close button. */}
            <header className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-1">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-extrabold leading-tight text-stone-900">{dish.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--primary)]">
                    {COURSE_LABEL[dish.course] ?? dish.course}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-stone-600 shadow-sm">
                    <Icon name="clock" size={13} strokeWidth={2.2} /> ~{dish.cookMin}&nbsp;min
                  </span>
                  {recipe && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-stone-600 shadow-sm">
                      {recipe.steps.length} étapes
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer la recette"
                className="-mr-1 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm transition active:scale-90"
              >
                <Icon name="x" size={20} strokeWidth={2.4} />
              </button>
            </header>

            {/* Steps */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
              {recipe ? (
                <>
                  {/* Ingredients for `people`, from the same engine as the shopping list — buy and cook
                      never disagree, and both scale with the diners. */}
                  {ingredients.length > 0 && (
                    <div className="mb-3 rounded-2xl bg-[var(--primary-soft)]/50 p-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-[var(--primary)]">
                        <Icon name="shopping-cart" size={14} strokeWidth={2.4} />
                        Ingrédients · pour {people}&nbsp;{people > 1 ? "personnes" : "personne"}
                      </p>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {ingredients.map((ing) => (
                          <li key={ing.foodId} className="text-sm font-semibold text-stone-600">
                            {ing.label} <span className="font-extrabold text-stone-900">{ing.qty}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <ol className="flex flex-col gap-2.5">
                    {steps.map((step, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-3 rounded-2xl border-2 border-stone-100 bg-white p-3.5"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduce ? 0 : 0.12 + i * 0.05, duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-extrabold text-white">
                          {i + 1}
                        </span>
                        <p className="pt-0.5 text-[15px] font-semibold leading-snug text-stone-800">{step}</p>
                      </motion.li>
                    ))}
                  </ol>

                  {recipe.tip && (
                    <motion.div
                      className="mt-3 flex items-start gap-2.5 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3.5"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduce ? 0 : 0.12 + recipe.steps.length * 0.05, duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <Icon name="lightbulb" size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-amber-500" />
                      <p className="text-sm font-semibold leading-snug text-amber-900">{recipe.tip}</p>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Icon name="book" size={32} strokeWidth={1.8} className="text-stone-300" />
                  <p className="font-bold text-stone-500">Recette bientôt disponible.</p>
                </div>
              )}
            </div>
            </PremiumGate>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
