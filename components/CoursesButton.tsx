"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AnimatedCartIcon } from "@/components/AnimatedCartIcon";
import { mondayOf, nearestPlannedWeekOffset, weekOffsetOfDate, ymdOf } from "@/lib/week";
import { unseenCount, weekKeys, weekMonday } from "@/lib/cartSeen";

// Last unseen count across remounts (the header remounts on navigation) so a real increase — an item
// added on another screen — still triggers the hop when the header comes back.
const CART_UNSEEN_LS = "atable.cart.lastUnseen";

// Header shortcut to the weekly shopping list. The red badge counts NEW products the user hasn't seen
// yet, ACROSS every upcoming week — so meals planned for a future week alert here until that week is
// viewed. The cart is drawn full whenever any planned week has items. "Seen" is tracked per week (the
// /courses page marks a week seen when you look at it), so each week's alert clears independently.
export function CoursesButton() {
  const pathname = usePathname();
  const onCourses = pathname === "/courses";
  const [full, setFull] = useState(false); // any planned week has items -> cart drawn full
  const [count, setCount] = useState(0); // total unseen items across weeks -> the red badge number
  // `bursting` drives the badge hop. To REPLAY on each add we flip it off then back on across a
  // frame (restarts the CSS animation) — no key remount, which leaked a 2nd svg.
  const [bursting, setBursting] = useState(false);
  // The cart hops in place for a bounded 5s window when something new arrives, then settles on its
  // own — or earlier if the user taps it. (No more forever-hopping.)
  const [hopping, setHopping] = useState(false);
  const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopHop = useCallback(() => {
    if (hopTimer.current) {
      clearTimeout(hopTimer.current);
      hopTimer.current = null;
    }
    setHopping(false);
  }, []);

  const load = useCallback(async (opts?: { hop?: boolean }) => {
    try {
      const base = new Date();
      const wideFrom = ymdOf(mondayOf(0, base));
      const wideTo = ymdOf(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 27));
      const [planRes, reqRes] = await Promise.all([
        apiFetch(`/api/meal-plan?from=${wideFrom}&to=${wideTo}`),
        apiFetch(`/api/shopping-requests`),
      ]);
      if (!planRes.ok) return;
      const data = await planRes.json();
      const entries: { date: string; slot: string; dishId: string }[] = Array.isArray(data) ? data : [];
      const reqRaw = await reqRes.json().catch(() => ({}));
      const requestIds: string[] = Array.isArray(reqRaw?.requests) ? reqRaw.requests.map((r: { id: string }) => r.id) : [];

      // Only the nearest planned week can be "done" (finished shopping) — fetch just that one.
      const activeOff = nearestPlannedWeekOffset(entries.map((e) => e.date), base);
      const doneRes = await apiFetch(`/api/shopping-done?week=${weekMonday(activeOff, base)}`);
      const activeDone = !!(await doneRes.json().catch(() => ({})))?.done;

      // Every week that has meals (0..4), plus week 0 which also carries the global requested products.
      const offsets = new Set<number>(entries.map((e) => weekOffsetOfDate(e.date, base)).filter((o) => o >= 0 && o <= 4));
      offsets.add(0);

      // Products the family removed from each week (composite keys) — so a list emptied by removals
      // reads as empty here too (empty cart, no red badge) instead of counting deleted items.
      const removedByOff: Record<number, Set<string>> = {};
      await Promise.all(
        [...offsets].map(async (off) => {
          try {
            const r = await apiFetch(`/api/shopping-removed?week=${weekMonday(off, base)}`);
            const j = await r.json().catch(() => ({}));
            removedByOff[off] = new Set(Array.isArray(j?.removed) ? j.removed : []);
          } catch {
            removedByOff[off] = new Set();
          }
        }),
      );

      let mealKeys = 0; // MEAL products only -> drives the cart fill (empty vs full)
      let unseen = 0; // meals + requested products -> the red "new" badge count (unchanged)
      for (const off of offsets) {
        let meals = weekKeys(entries, off, base);
        let all = off === 0 ? [...meals, ...requestIds] : meals;
        const rem = removedByOff[off];
        if (rem?.size) {
          meals = meals.filter((k) => !rem.has(k));
          all = all.filter((k) => !rem.has(k));
        }
        if (off === activeOff && activeDone) {
          meals = [];
          all = [];
        } // a finished list reads as empty
        mealKeys += meals.length;
        unseen += unseenCount(weekMonday(off, base), all);
      }

      // Full ONLY when there are real MEAL products to buy: a week holding just a stray requested
      // product (which /courses renders as the "Pas de repas cette semaine" empty state) reads
      // empty here too, so the header cart matches the page instead of showing a full basket over
      // an empty-looking list.
      setFull(mealKeys > 0);
      setCount(unseen);

      // Hop when explicitly asked (an item was just added) or when the unseen count grew on its own
      // (e.g. a meal planned on another device shows up on the 60s refresh). Skip the first load.
      let prev: number | null = null;
      try {
        const v = localStorage.getItem(CART_UNSEEN_LS);
        prev = v === null ? null : Number(v);
        localStorage.setItem(CART_UNSEEN_LS, String(unseen));
      } catch {
        /* private mode */
      }
      if (opts?.hop || (prev !== null && Number.isFinite(prev) && unseen > prev)) {
        setBursting(false);
        requestAnimationFrame(() => setBursting(true));
        // Hop the cart in place for 5s, then let it settle (restart the window on each new arrival).
        setHopping(true);
        if (hopTimer.current) clearTimeout(hopTimer.current);
        hopTimer.current = setTimeout(() => setHopping(false), 5000);
      }
    } catch {
      // best effort — no family / offline just leaves the cart as-is
    }
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (!document.hidden) load();
    };
    const onAdd = () => load({ hop: true }); // an item was added -> hop
    const onSeen = () => load(); // a week viewed/shrunk -> recompute the badge, no hop
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("atable:cart", onAdd);
    window.addEventListener("atable:cart-seen", onSeen);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("atable:cart", onAdd);
      window.removeEventListener("atable:cart-seen", onSeen);
      if (hopTimer.current) clearTimeout(hopTimer.current);
    };
  }, [load]);

  // Refresh on navigation (e.g. arriving on /courses marks a week seen -> its part of the badge clears).
  useEffect(() => {
    load();
  }, [pathname, load]);

  return (
    <Link
      href="/courses"
      onClick={stopHop}
      aria-label={count > 0 ? `Ma liste de courses, ${count} nouveau${count > 1 ? "x" : ""}` : "Ma liste de courses"}
      aria-current={onCourses ? "page" : undefined}
      className="relative flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-95"
    >
      {/* Empty cart when the list is empty, full when it has items; hops when an item is added.
          Empty is drawn BIGGER (size 40 = the bell's exact 22.5px height) and nudged up 2px so it
          centers on the bell's middle line; stroke 2.7 keeps the same 2.25px visual weight as size
          37 @ 2.92. The full cart is left untouched (size 37, stroke 2.92). */}
      <AnimatedCartIcon
        size={full ? 37 : 40}
        strokeWidth={full ? 2.92 : 2.7}
        run={hopping}
        empty={!full}
        className={full ? undefined : "-translate-y-[2px]"}
      />
      {count > 0 && (
        <span
          className={`absolute right-0.5 top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-extrabold leading-none text-white ring-2 ring-[var(--primary)] ${bursting ? "qm-badge-hop" : "pop"}`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
