"use client";

import type { CSSProperties } from "react";

/**
 * AnimatedCartIcon
 *
 * A line/outline shopping-cart icon, Duolingo-style, that hops in place on a loop.
 * On mount the groceries inside (box, bottle, baguette, leafy green) fall in with a
 * staggered gravity settle, then jiggle on every bounce.
 *
 * Design notes
 * - Pure SVG stroke (fill: none), no color fills. Color is driven by `stroke` so it
 *   inherits currentColor like the rest of the icon set (pass color="#fff" for a white
 *   outline on a colored surface, or set `text-white` on a parent).
 * - Zero animation dependency: everything is CSS keyframes injected inline, with
 *   uniquely-prefixed names (qm-*) so nothing collides with globals.css.
 * - Only transform/opacity are animated (GPU friendly). The bounce hops in place
 *   (translateY + a small landing squash), it never translates horizontally.
 * - Fully respects prefers-reduced-motion (renders a static, complete icon).
 */

export type AnimatedCartIconProps = {
  /** Rendered width and height in pixels. */
  size?: number;
  /** Speed multiplier for every loop (higher = faster). */
  speed?: number;
  /** Stroke color. Defaults to currentColor so it is themeable. */
  color?: string;
  /** SVG stroke width. */
  strokeWidth?: number;
  /** Freeze all animations. */
  paused?: boolean;
  /** When false, render a still, settled cart (groceries in, no motion) — the resting state. */
  run?: boolean;
  /** Play the bounce a couple of times then settle instead of looping forever (a "burst" on add). */
  oneShot?: boolean;
  /** When true, draw an empty cart (no groceries inside) — the list is empty. */
  empty?: boolean;
  /** Extra className on the root svg. */
  className?: string;
  /** Accessible label. When set the icon is exposed as an image; otherwise it is hidden. */
  title?: string;
};

type CartCSSVars = CSSProperties & {
  "--qm-speed"?: number;
  "--i"?: number;
};

export function AnimatedCartIcon({
  size = 96,
  speed = 1,
  color = "currentColor",
  strokeWidth = 2.2,
  paused = false,
  run = true,
  oneShot = false,
  empty = false,
  className,
  title,
}: AnimatedCartIconProps) {
  const safeSpeed = speed > 0 ? speed : 1;
  const labelled = typeof title === "string" && title.length > 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ "--qm-speed": safeSpeed } as CartCSSVars}
      data-qm-paused={paused ? "true" : undefined}
      data-qm-static={run ? undefined : "true"}
      data-qm-oneshot={oneShot ? "true" : undefined}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable={false}
    >
      {labelled ? <title>{title}</title> : null}

      <style>{STYLE}</style>

      {/* Whole cart + groceries hop together (with a landing squash) */}
      <g className="qm-bob">
        {/* Groceries, drawn behind the cart rim so they look tucked inside (hidden when the list is
            empty). Each item: outer group = gravity drop-in, inner group = settle jiggle. */}
        {!empty && (
          <g className="qm-items">
          {/* Leafy green (back-right) */}
          <g className="qm-item" style={{ "--i": 2 } as CartCSSVars}>
            <g className="qm-jiggle" style={{ "--i": 2 } as CartCSSVars}>
              <path d="M34 19 L34 15 Q34 12.5 36.5 12.5 Q37 10.5 39 11 Q41 10.5 41.5 13 Q43 13.5 42.5 16 L42.5 19 Z" />
            </g>
          </g>

          {/* Box / package (center, tallest) */}
          <g className="qm-item" style={{ "--i": 0 } as CartCSSVars}>
            <g className="qm-jiggle" style={{ "--i": 0 } as CartCSSVars}>
              <path d="M26.5 19 L26.5 8 Q26.5 6.5 28 6.5 L31.5 6.5 Q33 6.5 33 8 L33 19 Z" />
              <path d="M26.5 10 L33 10" />
            </g>
          </g>

          {/* Bottle (front-left) */}
          <g className="qm-item" style={{ "--i": 1 } as CartCSSVars}>
            <g className="qm-jiggle" style={{ "--i": 1 } as CartCSSVars}>
              <path d="M17.5 24 L17.5 14 Q17.5 12 19 11.5 L19 7.5 L21 7.5 L21 11.5 Q22.5 12 22.5 14 L22.5 24 Z" />
            </g>
          </g>
          </g>
        )}

        {/* Cart frame (on top of the items so the rim occludes their base) */}
        <g className="qm-frame">
          {/* Basket */}
          <path d="M14 19 L44 19 L39 32 L18 32 Z" />
          {/* Basket slats — dead vertical, and spaced so the orange gap between them equals the gap
              to each wall when you look at the TOP of the basket (5 equal segments across the top
              interior: ~5.7 apart, ~5.7 off each side). No more big voids on the sides. */}
          <path d="M20.3 21 L20.3 30" />
          <path d="M26.1 21 L26.1 30" />
          <path d="M31.8 21 L31.8 30" />
          <path d="M37.5 21 L37.5 30" />
          {/* Handle */}
          <path d="M5 13 L10 13 L14 19" />
          {/* 2 FILLED wheels stuck just UNDER the basket's bottom edge (below it, not overlapping). */}
          <circle cx="21" cy="36.6" r="3.1" fill="currentColor" stroke="none" />
          <circle cx="36" cy="36.6" r="3.1" fill="currentColor" stroke="none" />
        </g>
      </g>
    </svg>
  );
}

export default AnimatedCartIcon;

const STYLE = `
.qm-bob,
.qm-item,
.qm-jiggle {
  will-change: transform;
}

/* Whole cart hops in place forever, with a small landing squash */
.qm-bob {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: qm-cart-bounce calc(1.15s / var(--qm-speed, 1)) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) infinite;
}

/* Each grocery falls in once under gravity, staggered */
.qm-item {
  animation: qm-drop-in calc(0.6s / var(--qm-speed, 1)) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) calc(var(--i, 0) * 0.1s / var(--qm-speed, 1)) backwards;
}

/* ...then jiggles loosely on every bounce (starts after it has landed) */
.qm-jiggle {
  animation: qm-settle calc(1.15s / var(--qm-speed, 1)) var(--ease-in-out, cubic-bezier(0.77, 0, 0.175, 1)) calc((0.6s + var(--i, 0) * 0.1s) / var(--qm-speed, 1)) infinite;
}

[data-qm-paused="true"] .qm-bob,
[data-qm-paused="true"] .qm-item,
[data-qm-paused="true"] .qm-jiggle {
  animation-play-state: paused;
}

/* Resting state: no motion, groceries sitting settled in the basket. */
[data-qm-static="true"] .qm-bob,
[data-qm-static="true"] .qm-item,
[data-qm-static="true"] .qm-jiggle {
  animation: none !important;
}

/* Burst: hop a couple of times then settle back to rest (the header, on add). */
[data-qm-oneshot="true"] .qm-bob { animation-iteration-count: 2; }
[data-qm-oneshot="true"] .qm-jiggle { animation-iteration-count: 2; }

/* Hop in place: stretch up, hang, squash on landing, tiny rebound */
@keyframes qm-cart-bounce {
  0%   { transform: translateY(0)    scaleY(1); }
  15%  { transform: translateY(-3px) scaleY(1.03); }
  45%  { transform: translateY(-3px) scaleY(1.02); }
  68%  { transform: translateY(0)    scaleY(0.93); }
  82%  { transform: translateY(-1px) scaleY(1.01); }
  100% { transform: translateY(0)    scaleY(1); }
}

@keyframes qm-drop-in {
  0%   { transform: translateY(-16px); opacity: 0; }
  55%  { opacity: 1; }
  70%  { transform: translateY(2px); }
  85%  { transform: translateY(-1px); }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes qm-settle {
  0%, 100% { transform: translateY(0); }
  45%      { transform: translateY(0.8px); }
  62%      { transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .qm-bob,
  .qm-item,
  .qm-jiggle {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
`;
