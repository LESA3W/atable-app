"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SwipeCard, type SwipeCardHandle } from "@/components/SwipeCard";
import { VoteButton, VOTE_STYLE } from "@/components/VoteButton";
import { FoodFilmstrip } from "@/components/FoodFilmstrip";
import { prefersReducedMotion, type SwipeCardData, type SwipeDir } from "@/lib/swipe";
import { haptic } from "@/lib/native";
import type { Food, Status } from "@/lib/types";

// Map a swipe direction to the taste ring shown on the filmstrip (like → aime, coup de cœur is still
// an "aime", moyen → tolère, nope → n'aime pas).
const DIR_STATUS: Record<SwipeDir, Status> = { nope: "N", moyen: "M", like: "O", super: "O" };

// Fullscreen Tinder-style deck for the taste onboarding. Generic over the item type:
// pass getCard to map an item to its {emoji,title,subtitle}. onDecision fires per
// commit (nope/moyen/like/super); onReverse undoes it. When every card is swiped, or
// the user confirms "Faire plus tard", a mascot animation plays then onClose() enters
// the app.
export function SwipeDeck<T>({
  items,
  getCard,
  onDecision,
  onReverse,
  onClose,
  title = "Choisis tes goûts",
  filmstripFoods,
  filmstripEmoji,
  titleOnTop = false,
  cardTopRight,
  cardFooter,
  cardBack,
}: {
  items: T[];
  getCard: (t: T) => SwipeCardData;
  onDecision: (t: T, dir: SwipeDir) => void;
  onReverse: (t: T, dir: SwipeDir) => void;
  onClose: () => void;
  title?: string;
  // Optional: show the same little-card slider as "Mes goûts" under the deck. Pass the food list and
  // its emoji lookup; the per-food ring is derived from what's already been swiped this session.
  filmstripFoods?: Food[];
  filmstripEmoji?: (f: Food) => string;
  // Optional rich card (parity with "Mes goûts"): title over the image + a status pill / "préciser"
  // footer that flips the card + a favourite heart. The deck owns the flip state and hands each slot
  // a small context (its current status/favourite come from what was swiped this session).
  titleOnTop?: boolean;
  cardTopRight?: (item: T) => ReactNode;
  cardFooter?: (
    item: T,
    ctx: { flipped: boolean; toggleFlip: () => void; top: boolean; status: Status | undefined; favorite: boolean },
  ) => ReactNode;
  cardBack?: (item: T, ctx: { closeFlip: () => void }) => ReactNode;
}) {
  const [cursor, setCursor] = useState(0);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const historyRef = useRef<{ index: number; dir: SwipeDir }[]>([]);
  const [, force] = useState(0);
  const topRef = useRef<SwipeCardHandle>(null);
  const stripSyncRef = useRef<HTMLDivElement | null>(null);
  // The strip's thumbnails swell and pop UP over the card area while scrubbing, and the card paints
  // above them — so the card gives back 20px from its bottom edge to clear the way.
  const [stripOpen, setStripOpen] = useState(false);

  // Slide the filmstrip while the top card is dragged (same feel as "Mes goûts"). The picker stays put
  // in the centre and the THUMBNAILS travel LEFT — as if the strip were scrolling on to the next food,
  // which is what the swipe is about to do. Same motion whatever the drag direction, driven by the
  // DISTANCE rather than the signed dx. Snapped back on release (a commit re-centres it via cursor).
  function onCardDrag(dx: number, dy: number) {
    const el = stripSyncRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = `translateX(${(-Math.hypot(dx, dy) * 0.35).toFixed(1)}px)`;
  }
  function onCardDragEnd() {
    const el = stripSyncRef.current;
    if (!el) return;
    el.style.transition = "transform 260ms var(--ease-out)";
    el.style.transform = "translateX(0px)";
  }

  // This screen is cream, not orange: tint the iOS status bar cream for its lifetime
  // so there is no stray orange band at the top, then restore the app's orange.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", "#fef5ee");
    return () => {
      if (meta && prev) meta.setAttribute("content", prev);
    };
  }, []);

  // Rebuild when the item list genuinely CHANGES (diet filter): reset progress + history.
  //
  // Keyed on the list's CONTENT, never on the array's identity. The parent rebuilds this array on
  // every render (it holds the answers in state, so each vote re-renders it and hands us a brand new
  // array with the exact same foods). Depending on `items` therefore fired this reset after EVERY
  // vote and threw the user back to the first card — the bug that survived three attempts at fixing
  // it elsewhere.
  const itemsKey = `${items.length}|${items[0] ? getCard(items[0]).id : ""}|${
    items.length ? getCard(items[items.length - 1]).id : ""
  }`;
  useEffect(() => {
    setCursor(0);
    setConfirmSkip(false);
    historyRef.current = [];
    force((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  const empty = items.length === 0;
  const exhausted = cursor >= items.length;
  const remaining = items.length - cursor;
  const pct = items.length ? Math.min(100, Math.round((cursor / items.length) * 100)) : 0;

  // Ring colour for each filmstrip thumbnail = the most recent swipe decision for that food.
  const filmstripStatus = (id: string): Status | undefined => {
    for (let i = historyRef.current.length - 1; i >= 0; i--) {
      const h = historyRef.current[i];
      if (getCard(items[h.index]).id === id) return DIR_STATUS[h.dir];
    }
    return undefined;
  };
  // A coup de cœur (swiped up / "super") wears the favourite pink on its filmstrip ring.
  const filmstripFavorite = (id: string): boolean => {
    for (let i = historyRef.current.length - 1; i >= 0; i--) {
      const h = historyRef.current[i];
      if (getCard(items[h.index]).id === id) return h.dir === "super";
    }
    return false;
  };

  // All cards swiped -> auto-finish.
  useEffect(() => {
    if (!empty && exhausted) setFinishing(true);
  }, [empty, exhausted]);

  // Finish: play the mascot animation, then enter the app.
  useEffect(() => {
    if (!finishing) return;
    const t = setTimeout(() => onClose(), prefersReducedMotion() ? 300 : 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishing]);

  function handleCommit(index: number, dir: SwipeDir) {
    onDecision(items[index], dir);
    historyRef.current.push({ index, dir });
    setFlippedId(null);
    setCursor((c) => Math.max(c, index + 1));
    if (index + 1 >= items.length) void haptic("success"); // last card of the onboarding deck
    force((n) => n + 1);
  }

  function undo() {
    const last = historyRef.current.pop();
    if (!last) return;
    onReverse(items[last.index], last.dir);
    setCursor(last.index);
    force((n) => n + 1);
  }

  const node = (
    <div className={`page-in fixed inset-0 z-[95] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${finishing ? "bg-[var(--primary)] text-white" : "bg-[var(--background)]"}`}>
      {finishing ? (
        <div className="m-auto flex flex-col items-center gap-5 px-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="splash-logo splash-bob h-36 w-36 object-contain" />
          <div className="pop text-3xl font-extrabold text-white">C&apos;est prêt&nbsp;!</div>
          <div className="text-white/85">On t&apos;emmène à table…</div>
        </div>
      ) : (
        <>
          {/* Header sits BELOW the cards (z-10 < card z-30): a card dragged up slides
              OVER the title/progress. Only the bottom vote bar (z-40) stays above cards. */}
          <div className="relative z-10 px-4 pb-2 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-lg font-extrabold text-stone-900">{title}</div>
                {!empty && (
                  <div className="text-xs font-semibold text-muted">
                    {cursor}/{items.length} goûts remplis
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setConfirmSkip(true)}
                className="btn-3d btn-neutral shrink-0 rounded-full px-3.5 py-2 text-sm"
              >
                Continuer plus tard
              </button>
            </div>
            {!empty && (
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[var(--primary-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>

          {/* Centered confirm dialog to prevent accidental skips */}
          {confirmSkip && (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-6"
              onClick={() => setConfirmSkip(false)}
            >
              <div
                className="pop w-full max-w-xs rounded-3xl bg-white p-6 text-center text-stone-800 shadow-[0_16px_40px_rgba(43,42,40,0.3)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-4xl" aria-hidden>🤔</div>
                <h2 className="mt-2 text-xl font-extrabold">Tu es sûr(e)&nbsp;?</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Tu pourras compléter tes goûts quand tu veux dans « Mes goûts ».
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setFinishing(true)}
                    className="btn-3d btn-primary py-3 text-base"
                  >
                    Oui, plus tard
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSkip(false)}
                    className="btn-3d btn-neutral py-3 text-base"
                  >
                    Non, je continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {empty ? (
            <div className="m-auto max-w-xs text-center text-stone-600">
              <div className="text-5xl" aria-hidden>
                🤷
              </div>
              <p className="mt-2 font-bold">Rien à régler ici</p>
              <button
                type="button"
                onClick={onClose}
                className="btn-3d btn-primary mt-4 rounded-full px-5 py-2.5 text-sm"
              >
                Continuer
              </button>
            </div>
          ) : (
            <>
              {/* Card area. Gives back 20px from its BOTTOM while the strip is scrubbed, so the
                  swollen thumbnails (which pop up over it, and are painted under it) are not cut off.
                  Padding rather than height because this box is flex-1. */}
              <div
                className="relative mx-auto w-full max-w-sm flex-1 px-5 py-3"
                style={{
                  paddingBottom: stripOpen ? 42 : 12,
                  transition: "padding-bottom 220ms cubic-bezier(0.23, 1, 0.32, 1)",
                }}
              >
                <div className="relative h-full w-full">
                  {items.slice(cursor, cursor + 3).map((item, i) => {
                    const globalIndex = cursor + i;
                    const top = i === 0;
                    const cid = getCard(item).id;
                    const flipped = top && flippedId === cid;
                    return (
                      <SwipeCard
                        key={cid}
                        ref={top ? topRef : undefined}
                        data={getCard(item)}
                        stackIndex={i}
                        interactive={top && !flipped}
                        onCommit={(dir) => handleCommit(globalIndex, dir)}
                        onDragMove={top && filmstripFoods ? onCardDrag : undefined}
                        onDragEnd={top && filmstripFoods ? onCardDragEnd : undefined}
                        titleOnTop={titleOnTop}
                        flipped={flipped}
                        dim={!top && flippedId != null}
                        topRight={cardTopRight?.(item)}
                        footer={cardFooter?.(item, {
                          flipped,
                          toggleFlip: () => setFlippedId(flipped ? null : cid),
                          top,
                          status: filmstripStatus(cid),
                          favorite: filmstripFavorite(cid),
                        })}
                        back={cardBack?.(item, { closeFlip: () => setFlippedId(null) })}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Same little-card slider as "Mes goûts", synced to the deck (updates as you swipe). */}
              {filmstripFoods && (
                <FoodFilmstrip
                  foods={filmstripFoods}
                  index={cursor}
                  statusOf={filmstripStatus}
                  favoriteOf={filmstripFavorite}
                  emojiOf={filmstripEmoji ?? (() => "🍽️")}
                  onPick={(i) => setCursor(i)}
                  onScrubChange={setStripOpen}
                  syncRef={stripSyncRef}
                />
              )}

              {/* Vote bar stays above the cards (no opaque block): a card swiped down
                  (moyen) slides under the buttons. undo · nope · moyen · like · super */}
              <style>{VOTE_STYLE}</style>
              {/* J'aime pas / J'aime are the primary votes -> larger. items-end lines the smaller
                  buttons (undo, moyen, favori) up with the BOTTOM edge of the two big ones. */}
              <div className="relative z-40 flex items-end justify-center gap-1.5 px-1 py-4">
                {/* Each button gets its own buzz strength so a vote FEELS like what it is. */}
                <VoteButton tone="neutral" icon="undo" label="Revenir en arrière" disabled={historyRef.current.length === 0} onClick={undo} buzz="light" />
                <VoteButton tone="red" icon="thumbs-down" size="big" label="J'aime pas" onClick={() => topRef.current?.commit("nope")} buzz="medium" />
                <VoteButton tone="amber" icon="meh" label="Moyen / Tolère" onClick={() => topRef.current?.commit("moyen")} buzz="light" />
                <VoteButton tone="green" icon="thumbs-up" size="big" label="J'aime" onClick={() => topRef.current?.commit("like")} buzz="medium" />
                <VoteButton tone="pink" icon="heart" label="Coup de cœur" onClick={() => topRef.current?.commit("super")} buzz="success" />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
