"use client";

import { type RefObject, useCallback, useEffect, useRef } from "react";
import { foodPhoto } from "@/data/food-photos";
import { haptic } from "@/lib/native";
import type { Food, Status } from "@/lib/types";

// Every card, tiny, along the strip. At REST it's a compact row of SQUARE image-only thumbnails; the
// moment you press or scrub, the centred one swells (Photos-style), pops UP over the big card, grows
// taller and reveals its name. It doubles as the progress ribbon (each ring is that food's taste).
// The strip edges fade out so the cards leaving the viewport dissolve instead of being hard-cut.

// Sized so 7 thumbnails show across a phone width: floor((393 - ITEM_W) / PITCH) + 1 = 7.
const ITEM_W = 48;
// Two known box heights: a SQUARE at rest (image only), taller while scrubbing (image + name). The
// centre selector below mirrors both, so the frame stays an exact match in either state.
const ITEM_H_REST = ITEM_W; // square
const ITEM_H_SCRUB = 62;
const ITEM_RADIUS = 12; // = rounded-xl, kept numeric so the selector can derive from it
const ITEM_BORDER = 1.5;
const LABEL_H = 11;
const GAP = 6;
const PITCH = ITEM_W + GAP;
// Gap between the thumbnail and the selector frame around it. Also the scroller's bottom padding, so
// the frame sits exactly INSET below the thumbnail's baseline and stays concentric.
const INSET = 4;
// Only while scrubbing: the centred item swells to MAX_S, tapering to 1 (rest size) RANGE items out.
// Shared with the selector's CSS (injected below) so the two can never drift apart.
const MAX_S = 1.4;
const RANGE = 2.6;
// Silence after the last scroll event = momentum and snap are done.
const SETTLE_MS = 140;

const RING: Record<Status | "unset", string> = {
  O: "border-green-500",
  M: "border-amber-500",
  N: "border-red-500",
  // Not yet chosen: the neutral cream border (same "undecided" look as the big card).
  unset: "border-[var(--neutral-border)]",
};

export function FoodFilmstrip({
  foods,
  index,
  statusOf,
  favoriteOf,
  emojiOf,
  onPick,
  onScrubChange,
  syncRef,
}: {
  foods: Food[];
  index: number;
  statusOf: (foodId: string) => Status | undefined;
  // A favourite ("coup de cœur") overrides the taste colour with the favourite pink on its ring.
  favoriteOf?: (foodId: string) => boolean;
  emojiOf: (food: Food) => string;
  onPick: (index: number) => void;
  // Fired when the strip enters/leaves scrub mode, so the deck can make room: the thumbnails swell and
  // pop UP over the card area, which paints above them.
  onScrubChange?: (scrubbing: boolean) => void;
  // The big card's drag writes a translateX here so the thumbnails slide with the card. Points at the
  // SCROLLER, never at the wrapper: the centre picker is a sibling of the scroller and must stay
  // nailed to the same spot whatever happens. Owned by the parent (TasteDeck) so the parallax is
  // direct DOM writes, no React render per pointermove.
  syncRef?: RefObject<HTMLDivElement | null>;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const wrapperEl = useRef<HTMLDivElement | null>(null);
  const settle = useRef<number | undefined>(undefined);
  const raf = useRef(0);
  const scrubbing = useRef(false);
  const pointerDown = useRef(false);
  // TRUE only while a real finger-scrub is in flight. The deck owns the current card; the strip may
  // only propose a new one when the USER actually scrubbed it. It is armed on pointerdown and cleared
  // as soon as it is consumed, the finger leaves without scrolling, or the DECK drives a scroll —
  // otherwise a stale arm would let the post-vote auto-scroll pick a card and yank the deck back to
  // the start, which is exactly the bug this guards against.
  const userScrub = useRef(false);
  // TRUE while WE are scrolling the strip to follow the deck (after a vote). Those scroll events must
  // not put the strip in scrub mode: swelling the thumbnails changes the strip's height, which reflows
  // the column and made the vote-bar icons twitch and settle back on every single vote — and it also
  // fired the card's "make room" shrink for nothing. Only the visual matters here; picking is already
  // gated on `userScrub`.
  const programmatic = useRef(false);
  // Last thumbnail that sat under the centre selector, so we can buzz once per one crossed.
  const detent = useRef(-1);

  const paint = useCallback(() => {
    const sc = scroller.current;
    if (!sc) return;
    const off = sc.scrollLeft;
    const first = Math.max(0, Math.floor(off / PITCH) - 3);
    const last = Math.min(foods.length - 1, Math.ceil((off + sc.clientWidth) / PITCH) + 3);
    const scrub = scrubbing.current;
    for (let i = first; i <= last; i++) {
      const el = items.current[i];
      if (!el) continue;
      let s = 1;
      if (scrub) {
        const d = Math.min(1, Math.abs(i * PITCH - off) / (RANGE * PITCH));
        const k = 1 - d;
        s = 1 + (MAX_S - 1) * k * k * (3 - 2 * k);
      }
      el.style.transform = `scale(${s.toFixed(3)})`;
      el.style.zIndex = s > 1.001 ? String(Math.round(s * 100)) : "";
    }
    // One haptic tick per thumbnail crossing the selector — but only while the FINGER is driving, so
    // the auto-scroll that follows a vote stays silent (the vote already buzzed).
    if (userScrub.current) {
      const centred = Math.max(0, Math.min(foods.length - 1, Math.round(off / PITCH)));
      if (centred !== detent.current) {
        if (detent.current !== -1) void haptic("light");
        detent.current = centred;
      }
    }
  }, [foods.length]);

  function setScrub(on: boolean) {
    if (scrubbing.current === on) return;
    scrubbing.current = on;
    // Class on the WRAPPER (not the scroller) so it also drives the selector frame, which is a
    // sibling of the scroller.
    wrapperEl.current?.classList.toggle("qm-strip--scrub", on);
    onScrubChange?.(on);
    paint();
  }

  // Consume the pending scrub: hand the deck the centred card, then disarm.
  function commitScrub() {
    const sc = scroller.current;
    userScrub.current = false;
    if (!sc) return;
    const at = Math.max(0, Math.min(foods.length - 1, Math.round(sc.scrollLeft / PITCH)));
    if (at !== index) onPick(at);
  }

  function onScroll() {
    // Deck-driven follow scroll: repaint, keep the strip at rest, and drop the flag once it settles.
    if (programmatic.current) {
      paint();
      window.clearTimeout(settle.current);
      settle.current = window.setTimeout(() => {
        programmatic.current = false;
      }, SETTLE_MS);
      return;
    }
    setScrub(true);
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        paint();
      });
    }
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      // Only a genuine finger-scrub may move the deck (see `userScrub`), and never while the finger is
      // STILL DOWN: the user is mid-choice. Committing under the finger is what made a press-and-hold
      // glitch — the height flip on scrub-in nudges scrollLeft, which fired this timer and picked a
      // card the user had not settled on. onPointerUp does the commit instead.
      if (userScrub.current && !pointerDown.current) commitScrub();
      if (!pointerDown.current) setScrub(false);
    }, SETTLE_MS);
  }

  function onPointerDown() {
    pointerDown.current = true;
    programmatic.current = false; // the finger takes over from any follow scroll still in flight
    userScrub.current = true;
    detent.current = -1; // re-arm so the first crossed thumbnail doesn't buzz on touch-down
    setScrub(true);
  }
  function onPointerUp() {
    pointerDown.current = false;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      // Finger gone and everything has settled: consume the scrub if it hasn't been already (a slow
      // scrub with no momentum never re-fires onScroll), then ALWAYS disarm. Leaving it armed was
      // what let the next deck-driven auto-scroll steal a pick and jump back to the first card.
      if (userScrub.current) commitScrub();
      setScrub(false);
    }, SETTLE_MS);
  }

  // Follow the deck: centre the current card. The deck wins, so any pending finger-arm is dropped
  // first — the scroll we are about to cause must never be read back as a user pick.
  //
  // Scroll OUR scroller directly instead of scrollIntoView: that API scrolls every scrollable
  // ANCESTOR too, so it nudged the whole page a hair on each vote and the vote buttons visibly
  // twitched and settled back. The maths is exact anyway — the scroller is centre-padded, so item i
  // is centred at scrollLeft = i * PITCH.
  useEffect(() => {
    const sc = scroller.current;
    if (!sc || !items.current[index]) return;
    userScrub.current = false;
    programmatic.current = true;
    sc.scrollTo({ left: index * PITCH, behavior: "smooth" });
    paint();
  }, [index, paint]);

  useEffect(() => {
    paint();
  }, [foods, paint]);

  useEffect(
    () => () => {
      window.clearTimeout(settle.current);
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return (
    <div ref={wrapperEl} className="relative -mt-7 shrink-0">
      <style>{STRIP_STYLE}</style>
      {/* Fixed selector frame at the centre: cards scroll under it (picker-style), so it always marks
          which one is the current selection. It is an exact CONCENTRIC frame of a thumbnail — same
          border weight, box inflated by INSET on every side, radius = thumbnail radius + INSET — and
          it follows the thumbnail through BOTH shapes (square at rest, taller on scrub) and scales
          with the same MAX_S. */}
      <div
        aria-hidden
        className="qm-selector pointer-events-none absolute left-1/2 z-10 border-[var(--card-border)]"
        style={{
          bottom: 0,
          width: ITEM_W + INSET * 2,
          borderRadius: ITEM_RADIUS + INSET,
          borderWidth: ITEM_BORDER,
          borderStyle: "solid",
        }}
      />
      <div
        ref={(el) => {
          scroller.current = el;
          // Parallax target: only the thumbnails move, the picker above stays fixed.
          if (syncRef) syncRef.current = el;
        }}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="qm-strip flex snap-x snap-mandatory items-end gap-[6px] overflow-x-auto overscroll-x-contain pt-9"
        style={{
          paddingInline: `calc(50% - ${ITEM_W / 2}px)`,
          paddingBottom: INSET,
          willChange: "transform",
          // Edge fade: cards leaving the viewport dissolve instead of being cut in half.
          maskImage: "linear-gradient(to right, transparent 0, #000 7%, #000 93%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 7%, #000 93%, transparent 100%)",
        }}
      >
        {foods.map((f, i) => {
          const active = i === index;
          const st = statusOf(f.id);
          // A coup de cœur wears the favourite pink; otherwise the taste colour (or neutral).
          const ring = favoriteOf?.(f.id) ? "border-pink-500" : RING[st ?? "unset"];
          const photo = foodPhoto(f.id);
          return (
            <button
              key={f.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              onClick={() => onPick(i)}
              aria-label={f.label}
              aria-current={active || undefined}
              style={{ width: ITEM_W, borderRadius: ITEM_RADIUS, borderWidth: ITEM_BORDER }}
              // Border shows the taste (status colour) or "undecided" (neutral); the fixed centre
              // frame — not an orange card border — is what marks the current selection.
              className={`qm-strip-item flex shrink-0 snap-center flex-col items-center border-solid bg-white p-1 ${ring} ${active ? "shadow-[var(--shadow-card)]" : ""}`}
            >
              {/* Rest = a square showing only the image. Scrubbing grows the box and reveals the name. */}
              <span className="flex min-h-0 w-full flex-1 items-center justify-center">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" loading="lazy" className="max-h-full w-9 object-contain" />
                ) : (
                  <span className="text-[22px] leading-none" aria-hidden>
                    {emojiOf(f)}
                  </span>
                )}
              </span>
              <span className="qm-strip-label w-full shrink-0 truncate text-center text-[8px] font-bold text-stone-600">
                {f.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const STRIP_STYLE = `
.qm-strip {
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.qm-strip::-webkit-scrollbar {
  display: none;
}
/* REST: a square, image only.
   NOTE the box height (item, selector, label row) flips between the two shapes INSTANTLY, with no
   transition: animating height would run layout on every frame of that 240ms — right while the strip
   is being scrolled and the swell is repainting, i.e. the worst possible moment. The motion the eye
   follows is the scale + the name fading in, which are transform/opacity (compositor only). The flip
   also happens on pointerdown / after the scroll has settled, so it never lands mid-scroll. */
.qm-strip-item {
  position: relative;
  height: ${ITEM_H_REST}px;
  transform: scale(1);
  transform-origin: center bottom;
  transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1);
  -webkit-tap-highlight-color: transparent;
}
/* SCRUB: taller, with the name. */
.qm-strip--scrub .qm-strip-item {
  height: ${ITEM_H_SCRUB}px;
}
/* The selector mirrors the thumbnail's two shapes and grows from its bottom centre in step with the
   swelling centre card (same MAX_S). */
.qm-selector {
  height: ${ITEM_H_REST + INSET * 2}px;
  transform: translateX(-50%);
  transform-origin: 50% 100%;
  transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1);
}
.qm-strip--scrub .qm-selector {
  height: ${ITEM_H_SCRUB + INSET * 2}px;
  transform: translateX(-50%) scale(${MAX_S});
}
/* The name only exists while scrubbing; at rest it collapses so the thumbnail stays square. */
.qm-strip-label {
  height: 0;
  line-height: ${LABEL_H}px;
  opacity: 0;
  overflow: hidden;
  transition: opacity 200ms ease;
}
.qm-strip--scrub .qm-strip-label {
  height: ${LABEL_H}px;
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .qm-strip-item,
  .qm-selector,
  .qm-strip-label {
    transition-duration: 1ms;
  }
}
`;
