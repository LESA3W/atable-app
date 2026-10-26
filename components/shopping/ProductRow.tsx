"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { euro, type DishProduct } from "@/lib/estimate";

// Emil Kowalski's strong ease-out (also the app's --ease-out token). Reused everywhere so motion
// feels like one system.
const EASE = [0.23, 1, 0.32, 1] as const;

// One product line of the shopping list: check it off (strikes the whole line + collapses its
// controls), adjust how many packs to buy (− / +, price pops on change), or swap the brand (name
// blur-crossfades). All motion respects prefers-reduced-motion.
export function ProductRow({
  product,
  checked,
  canDelete,
  brand,
  isLast,
  onToggle,
  onRemove,
  onSwapBrand,
  onQtyDelta,
}: {
  product: DishProduct;
  checked: boolean;
  canDelete: boolean;
  brand: string | null;
  isLast: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onSwapBrand: () => void;
  onQtyDelta: (delta: number) => void;
}) {
  const reduce = useReducedMotion();
  const mounted = useRef(false); // so the price only pops on a real change, not on first paint
  useEffect(() => {
    mounted.current = true;
  }, []);
  const on = checked;
  const canSwap = product.brands.length > 1;

  return (
    <div className={`py-2 pl-0.5 pr-1 ${isLast ? "" : "border-b border-stone-100"}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={on}
          aria-label={on ? `Décocher ${product.label}` : `Cocher ${product.label}`}
          className="flex min-h-[44px] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left outline-none transition active:opacity-70 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${on ? "border-[var(--primary)] bg-[var(--primary)]" : "border-stone-300 bg-white"}`}>
            <AnimatePresence>
              {on && (
                <motion.svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="white"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.15, ease: EASE }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>
              )}
            </AnimatePresence>
          </span>
          <span className="min-w-0">
            <span className={`block text-base font-semibold ${on ? "text-stone-400 line-through" : "text-stone-800"}`}>{product.label}</span>
            <span className={`block truncate text-xs font-semibold ${on ? "text-stone-300 line-through" : "text-stone-400"}`}>
              {brand && (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={brand}
                    className={`inline-block ${on ? "" : "text-stone-500"}`}
                    initial={reduce ? false : { filter: "blur(4px)", opacity: 0 }}
                    animate={{ filter: "blur(0px)", opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { filter: "blur(4px)", opacity: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                  >
                    {brand}
                  </motion.span>
                </AnimatePresence>
              )}
              {brand ? " · " : ""}
              {product.qtyLabel}
            </span>
          </span>
        </button>
        <motion.span
          key={product.priceEur}
          className={`shrink-0 text-[1.31rem] font-extrabold ${on ? "text-stone-300 line-through" : "text-stone-700"}`}
          initial={mounted.current && !reduce ? { scale: 1.18 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 0.18, ease: EASE }}
        >
          {euro(product.priceEur)}
        </motion.span>
        {canDelete && !on && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Supprimer ${product.label}`}
            className="shrink-0 cursor-pointer rounded-full p-2 text-red-500 outline-none transition active:scale-90 active:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <Icon name="trash" size={18} />
          </button>
        )}
      </div>

      {/* Adjust the pack count or swap the brand — collapses away once the product is ticked. */}
      <AnimatePresence initial={false}>
        {!on && (
          <motion.div
            className="overflow-hidden"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className="mt-2 flex items-center gap-2">
              {/* "Changer" pinned FAR LEFT — mirrors the stepper pinned far right. */}
              {canSwap && (
                <button
                  type="button"
                  onClick={onSwapBrand}
                  aria-label={`Changer la marque de ${product.label}`}
                  className="flex h-9 cursor-pointer items-center gap-1 rounded-full border-2 border-stone-200 bg-white px-3 text-xs font-bold text-stone-600 outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <Icon name="swap" size={14} strokeWidth={2.2} /> Changer
                </button>
              )}
              {/* Quantity stepper pinned FAR RIGHT (ml-auto) — same style/shape as the "add a product" one. */}
              <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border-2 border-stone-200 bg-white px-1 py-1">
                <button
                  type="button"
                  onClick={() => onQtyDelta(-1)}
                  disabled={product.packs <= 1}
                  aria-label={`Moins de ${product.label}`}
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-lg font-extrabold leading-none outline-none transition active:scale-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${product.packs > 1 ? "bg-stone-600 text-stone-100" : "bg-stone-100 text-stone-400"}`}
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-extrabold text-stone-800">{product.packs}</span>
                <button
                  type="button"
                  onClick={() => onQtyDelta(1)}
                  aria-label={`Plus de ${product.label}`}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[var(--primary)] text-lg font-extrabold leading-none text-white outline-none transition active:scale-90 focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)]"
                >
                  +
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
