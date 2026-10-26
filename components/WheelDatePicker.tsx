"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// App-styled wheel date picker that opens downward: three vertical scroll-snap
// wheels (day, month, year) like the iOS date roller. Value is an ISO date
// "YYYY-MM-DD" (or "" when unset). Only scroll/transform are animated.

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const ITEM_H = 40; // px per row
const VISIBLE = 5; // odd: the middle row is the selection
const PAD = ((VISIBLE - 1) / 2) * ITEM_H; // top/bottom padding so first/last can center
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

type YMD = { y: number; m: number; d: number };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function parseISO(v: string): YMD | null {
  return ISO_RE.test(v) ? { y: +v.slice(0, 4), m: +v.slice(5, 7) - 1, d: +v.slice(8, 10) } : null;
}

function Wheel({
  items,
  index,
  onChange,
  ariaLabel,
}: {
  items: string[];
  index: number;
  onChange: (i: number) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const raf = useRef<number | undefined>(undefined);
  const idxRef = useRef(index);
  idxRef.current = index;

  // Stable ref callback: position the wheel on the selected row the moment it mounts
  // (before paint), so there is no visible jump from the top on open.
  const setRef = useCallback((el: HTMLDivElement | null) => {
    ref.current = el;
    if (el) el.scrollTop = idxRef.current * ITEM_H;
  }, []);

  // Keep the scroll in sync when the index changes from outside (e.g. day clamped
  // when the month shrinks). Direct scrollTop, no smooth, so it does not cascade.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 2) el.scrollTop = target;
  }, [index]);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
      if (i !== idxRef.current) onChange(i);
    });
  }

  return (
    <div
      ref={setRef}
      onScroll={onScroll}
      role="listbox"
      aria-label={ariaLabel}
      className="hide-scrollbar relative z-10 snap-y snap-mandatory overflow-y-scroll"
      style={{ height: VISIBLE * ITEM_H, flex: 1, scrollSnapType: "y mandatory" }}
    >
      <div style={{ height: PAD }} aria-hidden />
      {items.map((it, i) => (
        <div
          key={i}
          role="option"
          aria-selected={i === index}
          style={{ height: ITEM_H, scrollSnapAlign: "center" }}
          className={`flex items-center justify-center transition-colors ${
            i === index
              ? "text-[17px] font-extrabold text-stone-900"
              : "text-[15px] font-semibold text-stone-400"
          }`}
        >
          {it}
        </div>
      ))}
      <div style={{ height: PAD }} aria-hidden />
    </div>
  );
}

export function WheelDatePicker({
  value,
  onChange,
  max,
  placeholder = "Choisir…",
  alwaysOpen = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  max?: string; // ISO upper bound (e.g. today)
  placeholder?: string;
  alwaysOpen?: boolean; // render the wheels directly (no trigger/OK), e.g. onboarding
}) {
  const [open, setOpen] = useState(alwaysOpen);
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  // Ascending so scrolling down reaches more recent years (feels natural).
  for (let y = 1900; y <= currentYear; y++) years.push(y);

  // Internal selection so scrolling one wheel never resets another (each change
  // composes off the latest value via selRef, even when two wheels fire together).
  const [sel, setSel] = useState<YMD>(() => parseISO(value) ?? { y: 2000, m: 0, d: 1 });
  const selRef = useRef(sel);
  selRef.current = sel;

  useEffect(() => {
    const p = parseISO(value);
    if (p && (p.y !== selRef.current.y || p.m !== selRef.current.m || p.d !== selRef.current.d)) {
      setSel(p);
    }
  }, [value]);

  const dayCount = daysInMonth(sel.m, sel.y);
  const day = Math.min(sel.d, dayCount);
  const days = Array.from({ length: dayCount }, (_, i) => String(i + 1));

  function update(part: Partial<YMD>) {
    const base = selRef.current;
    const y = part.y ?? base.y;
    const m = part.m ?? base.m;
    const d = Math.min(part.d ?? base.d, daysInMonth(m, y));
    let iso = `${y}-${pad2(m + 1)}-${pad2(d)}`;
    if (max && iso > max) iso = max; // never allow a future birth date
    const next = parseISO(iso)!;
    selRef.current = next;
    setSel(next);
    onChange(iso);
  }

  // When shown open by default (onboarding), commit the visible default so the value
  // is valid and the "Continuer" button unlocks even if the user does not scroll.
  useEffect(() => {
    if (alwaysOpen && !ISO_RE.test(value)) update({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alwaysOpen]);

  const hasValue = ISO_RE.test(value);
  const label = hasValue ? `${day} ${MONTHS[sel.m]} ${sel.y}` : placeholder;
  const yearIndex = Math.max(0, years.indexOf(sel.y));

  return (
    <div>
      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-xl border-2 border-white/30 bg-white/95 px-3 py-2.5 text-left text-base text-stone-900 outline-none focus:border-white"
        >
          <span className={hasValue ? "font-semibold" : "text-stone-400"}>{label}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}

      {(open || alwaysOpen) && (
        <div className={`overflow-hidden rounded-2xl bg-white text-stone-900 shadow-[0_12px_34px_rgba(43,42,40,0.28)] ${alwaysOpen ? "" : "step-in mt-2"}`}>
          <div className="relative px-2" style={{ height: VISIBLE * ITEM_H }}>
            {/* selection band (behind the values): soft fill + hairline for iOS crispness */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-2 z-0 rounded-xl bg-[var(--primary-soft)] ring-1 ring-inset ring-[var(--primary)]/25"
              style={{ top: PAD, height: ITEM_H }}
            />
            <div className="flex h-full">
              <Wheel ariaLabel="Jour" items={days} index={day - 1} onChange={(i) => update({ d: i + 1 })} />
              <Wheel ariaLabel="Mois" items={MONTHS} index={sel.m} onChange={(i) => update({ m: i })} />
              <Wheel ariaLabel="Année" items={years.map(String)} index={yearIndex} onChange={(i) => update({ y: years[i] })} />
            </div>
            {/* top / bottom fade so rows melt into the panel (iOS wheel look) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-white via-white/85 to-transparent" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-white via-white/85 to-transparent" aria-hidden />
          </div>
          {!alwaysOpen && (
            <button
              type="button"
              onClick={() => {
                if (!hasValue) update({}); // commit the shown default if untouched
                setOpen(false);
              }}
              className="w-full border-t border-stone-100 py-3 text-sm font-extrabold text-[var(--primary)] transition active:scale-[0.99]"
            >
              OK
            </button>
          )}
        </div>
      )}
    </div>
  );
}
