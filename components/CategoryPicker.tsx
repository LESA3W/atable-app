"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { CATEGORIES } from "@/data/foods";

// Sentinel for the optional "every category" row (allowAll). Not a real category id.
export const ALL_CATEGORIES = "all";

type Entry = { id: string; label: string; icon: string };

const ALL_ENTRY: Entry = { id: ALL_CATEGORIES, label: "Toutes les catégories", icon: "saladbowl" };

// Category chooser — a real in-app menu (not the native iOS picker): a tappable trigger showing the
// current category's line icon, and a scrollable panel of icon + label rows. Closes on select,
// outside tap, or Escape. Two uses: picking a category when adding a food (allowAll off), and
// filtering the taste deck (allowAll on).
export function CategoryPicker({
  value,
  onChange,
  allowAll = false,
  compact = false,
}: {
  value: string;
  onChange: (id: string) => void;
  allowAll?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const entries: Entry[] = allowAll ? [ALL_ENTRY, ...CATEGORIES] : CATEGORIES;
  const selected = entries.find((c) => c.id === value) ?? entries[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center text-left transition focus:border-orange-300 ${
          compact
            ? "gap-1.5 rounded-full border-2 border-stone-200 bg-white py-1.5 pl-1.5 pr-2.5 active:scale-95"
            : "gap-2.5 rounded-xl border-2 border-stone-200 bg-white px-2.5 py-2"
        }`}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 ${
            compact ? "h-6 w-6 rounded-full" : "h-8 w-8"
          }`}
        >
          <Icon name={selected.icon} size={compact ? 15 : 20} />
        </span>
        <span
          className={`min-w-0 flex-1 truncate font-bold text-stone-800 ${
            compact ? "text-[13px]" : "text-base"
          }`}
        >
          {compact && selected.id === ALL_CATEGORIES ? "Toutes catégories" : selected.label}
        </span>
        <svg
          width={compact ? 15 : 20}
          height={compact ? 15 : 20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className={`pop absolute top-full z-40 mt-1.5 max-h-64 overflow-y-auto overscroll-contain rounded-2xl border-2 border-stone-100 bg-white p-1.5 shadow-[0_16px_40px_rgba(43,42,40,0.18)] ${
            compact ? "left-0 w-56" : "inset-x-0"
          }`}
        >
          {entries.map((c) => {
            const active = c.id === value;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition active:scale-[0.98] ${
                  active ? "bg-orange-50 text-orange-700" : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    active ? "bg-orange-100 text-orange-600" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  <Icon name={c.icon} size={18} />
                </span>
                <span className="flex-1 text-[15px] font-semibold">{c.label}</span>
                {active && <Icon name="check-circle" size={18} strokeWidth={2.4} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
