"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  decideDirection,
  prefersReducedMotion,
  type SwipeCardData,
  type SwipeDir,
} from "@/lib/swipe";
import { foodPhoto } from "@/data/food-photos";
import { haptic } from "@/lib/native";
import { Icon } from "@/components/Icon";

export type SwipeCardHandle = { commit: (dir: SwipeDir) => void };

type Props = {
  data: SwipeCardData;
  stackIndex: number; // 0 = top (interactive)
  interactive: boolean;
  onCommit: (dir: SwipeDir) => void;
  // Glyph size in px. The onboarding deck is full-screen and keeps the default; "Mes goûts" runs a
  // shorter card (it shares the screen with the filters, the filmstrip and the vote bar) and asks
  // for a smaller one.
  glyph?: number;
  // Optional slots. With none of them set the card renders exactly as the onboarding deck always
  // has; "Mes goûts" uses them to hang the category chip, the favourite heart, the status pill and
  // the "préciser" chip on the card.
  topLeft?: ReactNode;
  topRight?: ReactNode;
  footer?: ReactNode;
  // Rendered at the very TOP of the card, above the title and the image (titleOnTop mode). "Mes goûts"
  // hangs the vote-status pill here.
  topBanner?: ReactNode;
  // Passing `back` turns the card into a flipper (the per-form variants live on the back face).
  // The flip transition needs CARD_FLIP_STYLE mounted once on the screen — see TasteDeck.
  back?: ReactNode;
  flipped?: boolean;
  // Render the title at the TOP of the card (over the image) instead of below it.
  titleOnTop?: boolean;
  // Stack the cards flat (no peek offset/scale behind the top): the next card sits exactly where the
  // top is, so it doesn't animate up into place when the top flies away.
  flatStack?: boolean;
  // Live drag of the top card (both axes), so the parent can slide the filmstrip in sync whatever
  // direction the swipe goes.
  onDragMove?: (dx: number, dy: number) => void;
  onDragEnd?: () => void;
  // CSS color for the card border (defaults to the cream card border). "Mes goûts" passes a neutral
  // border while a food is unrated and the accent once it's decided.
  borderColor?: string;
  // Hide this card (used for the cards BEHIND the top one while it flips, so the 2D turn — which goes
  // edge-on at the midpoint — doesn't reveal the next food through the gap).
  dim?: boolean;
};

// The card's own chrome. Lives on the root when the card is flat, and on each face when it flips.
// The card's shell, minus padding — each face sets its own (the back is a dense list and can't
// afford the front's p-6). overflow-hidden is the safety net for very short screens: content clips
// at the rounded border instead of spilling outside the card.
const FACE =
  "absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] border-4 border-[color:var(--qm-border,var(--card-border))] bg-white shadow-[var(--shadow-card)]";

// A single draggable card. Drag is driven by direct style writes (refs, no re-render)
// for smoothness; only transform/opacity are touched.
export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  {
    data,
    stackIndex,
    interactive,
    onCommit,
    glyph = 132,
    topLeft,
    topRight,
    footer,
    topBanner,
    back,
    flipped = false,
    titleOnTop = false,
    flatStack = false,
    onDragMove,
    onDragEnd,
    borderColor,
    dim = false,
  },
  ref,
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLSpanElement>(null);
  const nopeRef = useRef<HTMLSpanElement>(null);
  const superRef = useRef<HTMLSpanElement>(null);
  const moyenRef = useRef<HTMLSpanElement>(null);
  const committed = useRef(false);
  const flyTimer = useRef<number | undefined>(undefined);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  useEffect(() => () => window.clearTimeout(flyTimer.current), []);
  const drag = useRef({
    active: false,
    id: -1,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    lastX: 0,
    lastT: 0,
    vx: 0,
    w: 0, // card size cached at pointerdown so pointermove never forces layout
    h: 0,
  });

  const baseTransform =
    stackIndex === 0 || flatStack
      ? "translate3d(0px, 0px, 0) rotate(0deg)"
      : `translate3d(0px, ${stackIndex * 10}px, 0) scale(${1 - stackIndex * 0.04})`;

  function setStamps(dx: number, dy: number, w: number, h: number) {
    const cx = 0.28 * w || 1;
    const cy = 0.24 * h || 1;
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    if (likeRef.current) likeRef.current.style.opacity = String(clamp(dx / cx));
    if (nopeRef.current) nopeRef.current.style.opacity = String(clamp(-dx / cx));
    if (superRef.current)
      superRef.current.style.opacity = String(clamp((-dy > Math.abs(dx) ? -dy : 0) / cy));
    if (moyenRef.current)
      moyenRef.current.style.opacity = String(clamp((dy > Math.abs(dx) ? dy : 0) / cy));
  }

  function flyOut(dir: SwipeDir) {
    const el = cardRef.current;
    if (!el || committed.current) return;
    committed.current = true;
    // Advance the deck when the fly-out ends. `transitionend` is the happy path, but iOS Safari
    // regularly DROPS it (the card is translated far off-screen / unmounts mid-transition), which left
    // the card frozen in place instead of moving to the next one — hence a guaranteed timer fallback.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("transitionend", finish);
      window.clearTimeout(flyTimer.current);
      onCommitRef.current(dir);
    };
    if (prefersReducedMotion()) {
      el.style.transition = "opacity 140ms linear";
      el.style.opacity = "0";
    } else {
      const offX =
        dir === "like" ? window.innerWidth * 1.2 : dir === "nope" ? -window.innerWidth * 1.2 : 0;
      const offY =
        dir === "super"
          ? -window.innerHeight * 1.1
          : dir === "moyen"
            ? window.innerHeight * 1.1
            : drag.current.dy;
      const rot = dir === "super" || dir === "moyen" ? 0 : dir === "like" ? 18 : -18;
      el.style.transition = "transform 320ms var(--ease-out), opacity 320ms linear";
      el.style.transform = `translate3d(${offX}px, ${offY}px, 0) rotate(${rot}deg)`;
      el.style.opacity = "0";
    }
    el.addEventListener("transitionend", finish);
    // Fallback if transitionend never fires. Tracked so it can be cancelled once the commit happened
    // and on unmount — otherwise it kept a live closure on a card that had already left the deck.
    flyTimer.current = window.setTimeout(finish, prefersReducedMotion() ? 180 : 380);
  }

  useImperativeHandle(ref, () => ({ commit: flyOut }), []);

  // If React reuses this instance for a different food (decks that key by position, not id), the
  // committed guard from the previous card would block the next vote — re-arm it on a new food.
  useEffect(() => {
    committed.current = false;
  }, [data.id]);

  // Pinch-flip: `showBack` lags the `flipped` prop to the pinch midpoint so the content swaps while
  // the card is squeezed edge-on (see the render). Pure 2D + JS timing — reliable on iOS where the
  // old CSS 3D/mirror flip either didn't animate or showed the front face through.
  const [showBack, setShowBack] = useState(flipped);
  const pinched = showBack !== flipped;
  useEffect(() => {
    if (showBack === flipped) return;
    if (prefersReducedMotion()) {
      setShowBack(flipped);
      return;
    }
    const t = setTimeout(() => setShowBack(flipped), 165);
    return () => clearTimeout(t);
  }, [flipped, showBack]);

  function onPointerDown(e: React.PointerEvent) {
    if (!interactive || committed.current) return;
    // A tap on one of the card's own controls (the heart, "préciser", a variant vote) must stay a
    // tap: capturing the pointer on the root retargets the whole sequence to the card, and the click
    // never reaches the button.
    if ((e.target as HTMLElement).closest("button, a")) return;
    const el = cardRef.current!;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture can throw for non-active pointers; drag still works
    }
    el.style.transition = "none";
    const r = el.getBoundingClientRect(); // measured once, reused for the whole drag
    drag.current = {
      active: true,
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      lastX: e.clientX,
      lastT: e.timeStamp,
      vx: 0,
      w: r.width,
      h: r.height,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.dx = e.clientX - d.startX;
    d.dy = e.clientY - d.startY;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) {
      d.vx = (e.clientX - d.lastX) / dt;
      d.lastX = e.clientX;
      d.lastT = e.timeStamp;
    }
    const el = cardRef.current!;
    const rot = Math.max(-14, Math.min(14, d.dx / 18));
    el.style.transform = `translate3d(${d.dx}px, ${d.dy}px, 0) rotate(${rot}deg)`;
    setStamps(d.dx, d.dy, d.w, d.h);
    onDragMove?.(d.dx, d.dy);
  }

  function onPointerEnd(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.active = false;
    onDragEnd?.();
    const el = cardRef.current!;
    const dir = decideDirection(d.dx, d.dy, d.vx, d.w, d.h);
    if (dir) {
      // Native buzz on the swipe gesture itself (the vote buttons buzz separately via VoteButton,
      // so this only covers the drag path — no double tap). "J'adore" gets a stronger one.
      void haptic(dir === "super" ? "medium" : "light");
      flyOut(dir);
    } else {
      el.style.transition = "transform 260ms var(--ease-out)";
      el.style.transform = baseTransform;
      setStamps(0, 0, d.w, d.h);
    }
  }

  const grab = interactive ? "cursor-grab active:cursor-grabbing" : "";

  const imageEl = foodPhoto(data.id) ? (
    // Photo produit sur fond blanc pur = le blanc de la card -> raccord invisible, zero detourage.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={foodPhoto(data.id)!}
      alt=""
      style={{ width: glyph * 1.5, height: glyph * 1.5 }}
      className="h-auto max-h-full w-auto object-contain"
    />
  ) : data.iconName ? (
    // Custom foods have no photo -> show their category's icon rather than a bare emoji.
    <Icon name={data.iconName} size={Math.round(glyph * 0.9)} />
  ) : (
    <span style={{ fontSize: Math.round(glyph * 0.848) }} className="leading-none" aria-hidden>
      {data.emoji}
    </span>
  );

  const face = (
    <>
      {/* Swipe stamps sit ABOVE everything on the card (title, image, pill, footer, heart): z-[20]
          beats the content column (z-[2]) and the corner chips (z-[3]). pointer-events-none so they
          never intercept a tap. */}
      <span
        ref={likeRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute left-5 top-6 z-[20] -rotate-12 rounded-xl border-4 border-green-500 bg-green-500 px-3 py-1 text-2xl font-extrabold text-white"
      >
        J&apos;AIME
      </span>
      <span
        ref={nopeRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute right-5 top-6 z-[20] rotate-12 rounded-xl border-4 border-red-500 bg-red-500 px-3 py-1 text-2xl font-extrabold text-white"
      >
        NON
      </span>
      <span
        ref={superRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute bottom-[81px] z-[20] rounded-xl border-4 border-pink-500 bg-pink-500 px-3 py-1 text-xl font-extrabold text-white"
      >
        💗 COUP DE CŒUR
      </span>
      <span
        ref={moyenRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute top-16 z-[20] rounded-xl border-4 border-amber-500 bg-amber-500 px-3 py-1 text-xl font-extrabold text-white"
      >
        😐 MOYEN
      </span>

      {titleOnTop ? (
        <>
          {/* Photo fills the card as the base layer; every UI element sits ABOVE it (z-0 vs z-[2+]).
              Product photos are on pure white, so the title over the top and the footer over the
              bottom land on white and stay readable. */}
          <div className="absolute inset-0 z-0 flex items-center justify-center p-6">{imageEl}</div>
          {topLeft && <div className="absolute left-3.5 top-3.5 z-[3]">{topLeft}</div>}
          {topRight && <div className="absolute right-3.5 top-3.5 z-[3]">{topRight}</div>}
          <div className="relative z-[2] flex h-full w-full flex-col">
            {/* Status pill etc. — above the title AND the image. */}
            {topBanner && <div className="flex shrink-0 justify-center pb-1 pt-0.5">{topBanner}</div>}
            {/* px-8 so a centred title clears the top-right heart. */}
            <div className="shrink-0 px-8 pt-0.5 text-center">
              <div className="text-2xl font-extrabold text-stone-900">{data.title}</div>
            </div>
            <div className="min-h-0 flex-1" />
            {footer && <div className="w-full shrink-0">{footer}</div>}
          </div>
        </>
      ) : (
        <>
          {topLeft && <div className="absolute left-3.5 top-3.5 z-[1]">{topLeft}</div>}
          {topRight && <div className="absolute right-3.5 top-3.5 z-[1]">{topRight}</div>}
          <div className="flex min-h-0 items-center justify-center">{imageEl}</div>
          <div className="shrink-0 px-2 text-center">
            <div className="text-2xl font-extrabold text-stone-900">{data.title}</div>
            {data.subtitle && (
              <div className="mt-1 line-clamp-2 text-sm font-semibold text-stone-500">{data.subtitle}</div>
            )}
          </div>
          {footer && <div className="w-full shrink-0">{footer}</div>}
        </>
      )}
    </>
  );

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      style={{
        transform: baseTransform,
        transition: "transform 260ms var(--ease-out)",
        zIndex: 30 - stackIndex,
        // Behind-card hidden while the top card flips (see `dim`).
        opacity: dim ? 0 : undefined,
        pointerEvents: dim ? "none" : undefined,
        // Dragging owns the gesture, so the card swallows touch panning — except while flipped, when
        // the back's variant list needs to scroll (an ancestor's `none` would veto its pan-y).
        touchAction: flipped ? "auto" : "none",
        willChange: "transform",
        // Border colour, inherited by the flip faces below (they're descendants).
        "--qm-border": borderColor ?? "var(--card-border)",
        // NO perspective/preserve-3d here: iOS Safari flattens a real-3D flip when the same element
        // carries a 2D transform (+ will-change), so the rotateY stopped animating on phone and the
        // card behind showed through at the edge-on midpoint. The flip below is a 2D rotateY (a
        // horizontal turn that works on every device) with the faces swapped at the half-turn.
      } as CSSProperties}
      className={back ? "absolute inset-0" : `${FACE} p-6 ${grab}`}
    >
      {back ? (
        // Pinch flip on an INNER wrapper (the root carries the drag transform). scaleX squeezes the
        // card shut; the content is swapped at the midpoint, then it opens on the other face. One
        // face rendered at a time, so it always shows the right side.
        <div
          className={`${FACE} ${showBack ? "" : `p-6 ${grab}`}`}
          style={{
            transform: pinched ? "scaleX(0.02)" : "scaleX(1)",
            transition: prefersReducedMotion() ? "none" : "transform 165ms ease-in-out",
          }}
        >
          {showBack ? back : face}
        </div>
      ) : (
        face
      )}
    </div>
  );
});

// The flip is now a self-contained JS pinch (inline transform on the card), so no global CSS is
// needed. Kept as an (empty) export so screens that still mount it don't break.
export const CARD_FLIP_STYLE = "";
