// Per-week "seen products" tracking for the cart badge — client-side (localStorage), shared by the
// header cart (CoursesButton) and the /courses page so their counts line up. Replaces the old single
// global `atable.cart.seen` blob: now each week keeps its own seen set, so products added to a FUTURE
// week can alert (red badge) until the user actually looks at THAT week.

import { DISHES } from "@/data/dishes";
import { mondayOf, weekOffsetOfDate, ymdOf } from "@/lib/week";

const DISH_BY_ID = Object.fromEntries(DISHES.map((d) => [d.id, d]));
const SEEN_WEEKS_LS = "atable.cart.seenWeeks";

type MealEntry = { date: string; slot: string; dishId: string };

// All product keys for the meals of one week offset — key = `date|slot|dishId|foodId`, the SAME
// format the header + /courses use, so seen/unseen comparisons match. (Removed items are NOT
// subtracted: they get marked seen on view like everything else, which avoids phantom "unseen".)
export function weekKeys(entries: MealEntry[], offset: number, base: Date = new Date()): string[] {
  const keys: string[] = [];
  for (const e of entries) {
    if (weekOffsetOfDate(e.date, base) !== offset) continue;
    const dish = DISH_BY_ID[e.dishId];
    if (dish) for (const ing of dish.ingredients) keys.push(`${e.date}|${e.slot}|${e.dishId}|${ing}`);
  }
  return keys;
}

// The Monday (YYYY-MM-DD) that identifies a week offset — the key of the per-week seen map.
export function weekMonday(offset: number, base: Date = new Date()): string {
  return ymdOf(mondayOf(offset, base));
}

function readMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(SEEN_WEEKS_LS);
    const m = raw ? JSON.parse(raw) : {};
    return m && typeof m === "object" ? (m as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

// The keys the user has already seen for a given week (by its Monday).
export function getSeenWeek(mon: string): Set<string> {
  const arr = readMap()[mon];
  return new Set(Array.isArray(arr) ? arr : []);
}

// Overwrite one week's seen keys with its current products (called when the user views that week).
// Empty -> drop the entry so the map doesn't grow forever.
export function setSeenWeek(mon: string, keys: string[]): void {
  if (!keys.length) return; // never wipe a week's seen set — a transient empty must not resurrect the badge
  try {
    const m = readMap();
    // UNION: once a product key is seen it stays seen, so switching weeks and coming back never
    // re-flags it. (The old behaviour overwrote the set, so a stale/partial write could un-see products.)
    const merged = new Set(m[mon] ?? []);
    for (const k of keys) merged.add(k);
    m[mon] = [...merged];
    localStorage.setItem(SEEN_WEEKS_LS, JSON.stringify(m));
  } catch {
    /* private mode */
  }
}

// How many of `keys` the user hasn't seen yet for a week.
export function unseenCount(mon: string, keys: string[]): number {
  const seen = getSeenWeek(mon);
  let n = 0;
  for (const k of keys) if (!seen.has(k)) n++;
  return n;
}
