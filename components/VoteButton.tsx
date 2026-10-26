"use client";

import { type CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { haptic, type Haptic } from "@/lib/native";

// The tonal round vote button, shared by the onboarding deck (SwipeDeck), the "Mes goûts" deck
// (TasteDeck) and the per-form variant rows on a card — so a press feels identical everywhere.

export type Tone = "neutral" | "red" | "amber" | "green" | "pink";

const TONE_RING: Record<Tone, string> = {
  neutral: "border-stone-200",
  red: "border-red-200",
  amber: "border-amber-200",
  green: "border-green-200",
  pink: "border-pink-200",
};

// Fill color per tone — also the resting icon color (via the --qm-tone custom property the icon
// inherits through currentColor). On press the button fills with it fast; on release it drains back
// to transparent slowly. See the `.qm-vote` rules in VOTE_STYLE below.
const TONE_FILL: Record<Tone, string> = {
  neutral: "#a8a29e", // stone-400
  red: "#ef4444", // red-500
  amber: "#f59e0b", // amber-500
  green: "#16a34a", // green-600
  pink: "#ec4899", // pink-500
};

// Solid variant, for a button that stays "on" (a selected variant status) rather than reacting to a
// press: the tone fills the button for good and the icon flips white.
const TONE_SOLID: Record<Tone, string> = {
  neutral: "border-stone-400 bg-stone-400",
  red: "border-red-500 bg-red-500",
  amber: "border-amber-500 bg-amber-500",
  green: "border-green-600 bg-green-600",
  pink: "border-pink-500 bg-pink-500",
};

export type VoteSize = "big" | "md" | "sm";

const BOX: Record<VoteSize, string> = {
  big: "h-[4.5rem] w-[4.5rem]", // 72px (was 67)
  md: "h-[3.8rem] w-[3.8rem]", // 61px (was 56)
  sm: "h-[2.9rem] w-[2.9rem]", // ~47px (+30% from 36, variant rows)
};
const GLYPH: Record<VoteSize, number> = { big: 34, md: 28, sm: 24 };

export function VoteButton({
  icon,
  label,
  onClick,
  disabled,
  locked,
  tone = "neutral",
  size = "md",
  active = false,
  buzz,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  // Greyed out like `disabled`, but STILL clickable: a native disabled button swallows the click,
  // and read-only mode needs the tap to come through so it can explain why nothing happened.
  locked?: boolean;
  tone?: Tone;
  size?: VoteSize;
  active?: boolean;
  // Per-button haptic. Without it the app-wide AppChrome listener fires a plain "light" on any button;
  // pass one to give THIS button its own strength (a coup de cœur should not feel like an undo) — we
  // then opt out of the global one via data-haptic so it can't buzz twice.
  buzz?: Haptic;
}) {
  return (
    <button
      type="button"
      data-haptic={buzz ? "off" : undefined}
      onPointerDown={buzz ? () => void haptic(buzz) : undefined}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // Deliberately NOT aria-disabled: the button stays fully operable, it just answers with an
      // explanation instead of a vote. Marking it disabled would contradict that for assistive tech.
      aria-pressed={active || undefined}
      style={{ "--qm-tone": TONE_FILL[tone] } as CSSProperties}
      className={`qm-vote flex shrink-0 items-center justify-center rounded-full border-2 shadow-[var(--shadow-card)] active:scale-90 ${BOX[size]} ${
        locked ? "qm-vote--locked " : ""
      }${
        active ? `${TONE_SOLID[tone]} text-white` : `bg-white ${TONE_RING[tone]}`
      }`}
    >
      <Icon name={icon} size={GLYPH[size]} strokeWidth={2.1} />
    </button>
  );
}

// Press = the button fills with its tone color and the icon flips white (fast, instant feedback).
// Release = the fill drains back out through transparency, slowly, on a strong ease-out curve — so
// the color "empties" instead of snapping off. A ::before overlay carries the fill (opacity), and the
// asymmetric transition durations (90ms in on :active, 620ms out at rest) do the fast-fill / slow-drain.
// Mount this once per screen; it styles every .qm-vote below it.
export const VOTE_STYLE = `
.qm-vote {
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  color: var(--qm-tone);
  transition: color 1700ms cubic-bezier(0.23, 1, 0.32, 1), transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}
.qm-vote[aria-pressed="true"] {
  color: #fff;
}
.qm-vote::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--qm-tone);
  opacity: 0;
  transition: opacity 1700ms cubic-bezier(0.23, 1, 0.32, 1);
  pointer-events: none;
}
.qm-vote > svg {
  position: relative;
  z-index: 1;
}
.qm-vote:disabled {
  opacity: 0.4;
}
.qm-vote:not(:disabled):active {
  color: #fff;
  transition: color 90ms ease-out, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}
.qm-vote:not(:disabled):active::before {
  opacity: 1;
  transition: opacity 90ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .qm-vote,
  .qm-vote::before {
    transition-duration: 1ms;
  }
}
`;
