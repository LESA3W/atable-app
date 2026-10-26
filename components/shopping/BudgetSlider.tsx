"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";

// Emil Kowalski's strong ease-out (the app's --ease-out token) — reused so motion feels like one system.
const EASE = [0.23, 1, 0.32, 1] as const;

// Budget slider for the shopping list. No prices here (the running total lives in the sticky header):
// just a status that names where you are — cheapest brands (left) -> best value -> best quality (right).
// The list defaults to level 0.5 (median brand per food); the parent re-estimates from `level`.
const ZONES = [
  { label: "Prix le plus bas", color: "text-green-600", emoji: "😊" },
  { label: "Bon rapport qualité-prix", color: "text-green-600", emoji: "😎" },
  { label: "Meilleure qualité", color: "text-[#1e3a5f]", emoji: "🤩" },
] as const;

export function BudgetSlider({ level, onLevel }: { level: number; onLevel: (t: number) => void }) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const clamp = (t: number) => Math.max(0, Math.min(1, t));
  const pct = clamp(level) * 100;
  const STEP = 0.125;
  const zone = level < 0.34 ? 0 : level < 0.67 ? 1 : 2;
  const z = ZONES[zone];

  function levelFromClientX(clientX: number) {
    const el = trackRef.current;
    if (!el) return level;
    const r = el.getBoundingClientRect();
    return clamp((clientX - r.left) / Math.max(1, r.width));
  }
  function onDown(e: React.PointerEvent) {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    onLevel(levelFromClientX(e.clientX));
  }
  function onMove(e: React.PointerEvent) {
    if (dragging.current) onLevel(levelFromClientX(e.clientX));
  }
  function onUp() {
    dragging.current = false;
  }

  return (
    <div className="rounded-2xl border-2 border-stone-100 bg-white p-3.5 shadow-[var(--shadow-card)]">
      <div className="flex justify-center overflow-hidden">
        <motion.div
          key={zone}
          initial={reduce ? false : { y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.22, ease: EASE }}
          className={`flex items-center gap-1.5 text-[15px] font-extrabold ${z.color}`}
        >
          <span className="text-[17px] leading-none" aria-hidden>{z.emoji}</span>
          {z.label}
        </motion.div>
      </div>

      <div className="mt-3 flex items-center gap-[17px]">
        <button
          type="button"
          onClick={() => onLevel(clamp(level - STEP))}
          disabled={level <= 0.001}
          aria-label="Marques moins chères"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-lg font-extrabold text-stone-600 transition active:scale-90 disabled:opacity-40"
        >
          −
        </button>

        <div
          ref={trackRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label="Niveau de budget"
          className="relative h-3.5 flex-1 cursor-pointer touch-none rounded-full bg-stone-200"
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]"
            animate={{ width: `${pct}%` }}
            transition={{ duration: reduce || dragging.current ? 0 : 0.28, ease: EASE }}
          />
          <motion.div
            className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-white shadow-[0_2px_8px_rgba(43,42,40,0.22)]"
            animate={{ left: `${pct}%` }}
            transition={{ duration: reduce || dragging.current ? 0 : 0.28, ease: EASE }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" aria-hidden />
          </motion.div>
        </div>

        <button
          type="button"
          onClick={() => onLevel(clamp(level + STEP))}
          disabled={level >= 0.999}
          aria-label="Marques plus chères"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-extrabold text-white shadow-[0_2px_6px_rgba(242,111,28,0.4)] transition active:scale-90 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
