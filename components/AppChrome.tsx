"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { haptic } from "@/lib/native";
import { TopNav } from "@/components/TopNav";
import { ProfileButton } from "@/components/ProfileButton";
import { CoursesButton } from "@/components/CoursesButton";
import { NotificationBell } from "@/components/NotificationBell";
import { BottomNav } from "@/components/BottomNav";
import { BackButton } from "@/components/BackButton";

// The "menu home" screens that keep the full orange header + the bottom nav. Everywhere else the
// chrome collapses to a back button (deep pages) or nothing (the Repas wizard owns its own top).
// "/preferences" is NOT one of them: Mes goûts is a full-screen card deck, and the header (69px) plus
// the nav would eat a third of the card's height — it takes the deep-page back bar instead.
const NAV_HOME_ROUTES = new Set(["/notifications", "/semaine", "/parametres"]);
// Bare routes that render their OWN top header (chevron on the title/mascot line), so the generic
// slim BackButton bar must NOT also render.
const NO_BACKBAR = new Set(["/preferences", "/courses", "/cuisiner", "/famille", "/invite"]);
// Routes with a sticky bar that pins just under the notch (cook progress, courses tally). They get an
// opaque notch filler so the page can't scroll through the safe-area gap above that bar.
const NOTCH_FILL = new Set(["/cuisiner", "/courses"]);
// Public legal/support pages opened in a plain browser (privacy policy, support). They must read like
// a standalone web document, so the app chrome (orange header, back bar, bottom nav) renders nothing.
const PUBLIC_BARE = new Set(["/confidentialite", "/aide"]);

// Owns the app chrome (header, bottom nav, back button) so its visibility can track the route.
// - home  : orange header + Revolut bottom nav (the 4 menu homes)
// - meal   : "/" wizard — no header/nav (it renders its own full-screen sheet + back control)
// - bare   : deep pages (/courses, /historique, …) — a slim back bar only
// On >=md the header always shows (desktop keeps TopNav); the mobile-only bits are gated in their
// own components. `data-chrome` on <html> drives the responsive --header-h / --bottomnav-space vars.
export function AppChrome() {
  const pathname = usePathname();
  const isHome = NAV_HOME_ROUTES.has(pathname);
  const chrome = isHome ? "home" : pathname === "/" ? "meal" : "bare";

  useEffect(() => {
    document.documentElement.dataset.chrome = chrome;
  }, [chrome]);

  // One light haptic on ANY interactive tap, app-wide — so every button/link buzzes without wiring
  // each one. `pointerdown` fires the instant you press (before the action = best tactile feel).
  // Elements with their own richer haptic (cook rewards, etc.) opt out with data-haptic="off" so they
  // don't double up; a stronger accent like a delete's "medium" is layered on top on purpose.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        'button, a[href], [role="button"], [role="switch"], [role="tab"], summary',
      );
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      if (el.closest('[data-haptic="off"]')) return;
      void haptic("light");
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  // Public legal/support pages own the full viewport as a plain document: no header, no back bar, no
  // bottom nav. (After the hooks above, so the Rules of Hooks hold.)
  if (PUBLIC_BARE.has(pathname)) return null;

  return (
    <>
      <header
        className={`sticky top-0 z-20 border-b-4 border-[var(--primary-dark)] bg-[var(--primary)] pt-[env(safe-area-inset-top)] print:hidden ${
          isHome ? "" : "hidden md:block"
        }`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-[3px] md:max-w-5xl">
          {/* Left: profile avatar */}
          <ProfileButton />
          {/* Center: logo + wordmark */}
          <Link href="/" aria-label="À table, accueil" className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-[59px] w-[59px] shrink-0 object-contain md:h-[68px] md:w-[68px]" />
            <span className="whitespace-nowrap text-[1.8rem] font-extrabold leading-none tracking-tight text-white sm:text-[2.34rem]">
              À table&nbsp;!
            </span>
          </Link>
          {/* Right: nav (desktop) + shopping-list shortcut + notification bell */}
          <div className="flex items-center gap-1 md:gap-2">
            <TopNav />
            <CoursesButton />
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Subtle frosted strip fading out flush under the (opaque) header — iOS scroll-edge feel.
          Sits at top:var(--header-h), which now equals the REAL header height so it's glued (no gap). */}
      {isHome && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 z-[15] md:hidden print:hidden"
          style={{
            top: "var(--header-h)",
            height: "39px",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            backgroundColor: "rgba(255,255,255,0.05)",
            maskImage: "linear-gradient(to bottom, #000 0%, #000 16%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 16%, transparent 100%)",
          }}
        />
      )}

      {/* Notch filler (mobile). NO_BACKBAR pages hide the orange header, so nothing covers the
          safe-area/notch. Their own sticky bar (cook progress, courses tally) pins UNDER the notch, so
          without this the page scrolls through the gap above it and the content shows in the notch —
          the "void" that only appears on a real notched phone (env() is 0 in the desktop preview).
          An opaque cream strip, just under the sticky bars (z-9 < their z-10), fills it. +8px reaches
          the courses bar, which pins at safe-area+8. */}
      {NOTCH_FILL.has(pathname) && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[9] bg-[var(--background)] md:hidden print:hidden"
          style={{ height: "calc(env(safe-area-inset-top) + 8px)" }}
        />
      )}

      {/* Deep pages: a back button in place of the header (mobile). NO_BACKBAR routes render their OWN
          header (chevron on the same line as the title / mascot). */}
      {chrome === "bare" && !NO_BACKBAR.has(pathname) && <BackButton />}

      {/* Progressive frosted base behind the floating nav: full blur at the bottom, fading to none
          around the nav's middle, gone by its top — so content scrolling under the bar softly frosts.
          Sits under the nav (z-40 < nav z-50) and over the page; taps pass through. */}
      {(isHome || chrome === "meal") && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden print:hidden"
          style={{
            height: "calc(var(--bottomnav-space) + 10px)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            backgroundColor: "rgba(255,255,255,0.10)",
            maskImage: "linear-gradient(to top, #000 0%, #000 44%, transparent 88%)",
            WebkitMaskImage: "linear-gradient(to top, #000 0%, #000 44%, transparent 88%)",
          }}
        />
      )}

      {/* Bottom nav: the 4 menu homes AND the Repas wizard (phones only — component is md:hidden). */}
      {(isHome || chrome === "meal") && <BottomNav />}
    </>
  );
}
