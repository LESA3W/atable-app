"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { Icon } from "@/components/Icon";

// Floating bottom tab bar, phones only (>=md uses TopNav in the header). Revolut-style: a white
// rounded bar floating above the home indicator. The selected tab gets a soft transparent-orange
// highlight shaped like the bar (a smaller rounded rect); the central "Repas" (new-meal) tab is a
// bigger, always-filled orange disc — the primary action — nudged up a touch, with a bare white +
// (no ring) and a crisp Emil-style press. Aligned to the content column (max-w-3xl + 16px gutters).
// Visibility is decided by AppChrome (the 4 menu homes and the Repas wizard).
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-[max(2px,calc(env(safe-area-inset-bottom)-17px))] z-50 flex justify-center px-4 md:hidden print:hidden">
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-end gap-0.5 rounded-[22px] bg-white px-2 py-1.5 shadow-[0_10px_30px_rgba(43,42,40,0.14)] ring-1 ring-black/5">
        {NAV_ITEMS.map((l) => {
          const active = pathname === l.href;

          // Central "Repas" tab — the primary action: a bigger, always-filled orange disc with a bare
          // white + (no ring), nudged up just enough to read as the hero button, with a springy press.
          if (l.href === "/") {
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-label={l.label}
                className="flex flex-1 flex-col items-center justify-end"
              >
                <span className="-mt-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_5px_14px_rgba(242,111,28,0.5)] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform active:scale-90 active:shadow-[0_2px_8px_rgba(242,111,28,0.55)]">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-end gap-1 rounded-[15px] py-1.5 transition active:scale-95 ${
                active ? "bg-[var(--primary)]/12" : ""
              }`}
            >
              <span className={active ? "text-[var(--primary)]" : "text-stone-400"}>
                <Icon name={l.icon} size={19} strokeWidth={2.3} />
              </span>
              <span className={`text-[10px] font-bold leading-none ${active ? "text-[var(--primary)]" : "text-stone-400"}`}>
                {l.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
