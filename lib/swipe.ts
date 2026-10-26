// Shared types + threshold math for the Tinder-style SwipeDeck.
import type { Status } from "@/lib/types";

export type SwipeDir = "like" | "nope" | "super" | "moyen";

export type SwipeCardData = {
  id: string;
  title: string;
  emoji: string;
  // Category line-icon name (components/Icon). Shown instead of the emoji for foods with no photo
  // (i.e. user-added custom foods), so an added food wears its category's icon, not a bare emoji.
  iconName?: string;
  subtitle?: string;
};

// Commit thresholds as a fraction of the card size.
export const COMMIT_X_RATIO = 0.28;
export const COMMIT_Y_RATIO = 0.24;
// Horizontal velocity (px/ms) above which a quick flick commits under threshold.
export const FLICK_VELOCITY = 0.6;

// Which direction a release commits to, or null to spring back.
export function decideDirection(
  dx: number,
  dy: number,
  vx: number,
  w: number,
  h: number,
): SwipeDir | null {
  const commitX = COMMIT_X_RATIO * w;
  const commitY = COMMIT_Y_RATIO * h;
  // Vertical gestures win when dominantly up (super) or down (moyen/tolère).
  if (-dy > commitY && -dy > Math.abs(dx)) return "super";
  if (dy > commitY && dy > Math.abs(dx)) return "moyen";
  if (dx > commitX) return "like";
  if (dx < -commitX) return "nope";
  if (Math.abs(vx) > FLICK_VELOCITY) return vx > 0 ? "like" : "nope";
  return null;
}

// A swipe direction as a stored preference. "like" and "super" are both "aime" — super only adds the
// favorite. Callers must pass the food's CURRENT favorite through `wasFavorite`: the API coerces a
// missing `favorite` to false and always writes the column, so omitting it silently un-favorites.
export function dirToPref(dir: SwipeDir, wasFavorite = false): { status: Status; favorite: boolean } {
  return {
    status: dir === "nope" ? "N" : dir === "moyen" ? "M" : "O",
    favorite: dir === "super" || wasFavorite,
  };
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
