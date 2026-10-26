"use client";

import { useEffect, useRef, useState } from "react";
import { CARD_FLIP_STYLE, SwipeCard, type SwipeCardHandle } from "@/components/SwipeCard";
import { VoteButton, VOTE_STYLE } from "@/components/VoteButton";
import { FoodFilmstrip } from "@/components/FoodFilmstrip";
import { Icon } from "@/components/Icon";
import { CATEGORIES, variantsFor } from "@/data/foods";
import { dirToPref, type SwipeCardData, type SwipeDir } from "@/lib/swipe";
import { haptic } from "@/lib/native";
import type { Food, Status } from "@/lib/types";

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
// This card carries no category chip and no description (the strip below already says where you are,
// and the point here is to answer fast). The image now fills the card behind the overlaid title/
// footer, so this is just its max size.
const GLYPH = 150;

type Pill = { icon: string; label: string; className: string };
const STATUS_PILL: Record<Status, Pill> = {
  O: { icon: "thumbs-up", label: "Aime", className: "border-green-200 bg-green-50 text-green-700" },
  M: { icon: "meh", label: "Moyen", className: "border-amber-200 bg-amber-50 text-amber-700" },
  N: { icon: "thumbs-down", label: "Aime pas", className: "border-red-200 bg-red-50 text-red-700" },
};
// A favourite reads as "Coup de cœur" rather than plain "Aime".
const COUP_PILL: Pill = { icon: "heart", label: "Coup de cœur", className: "border-pink-200 bg-pink-50 text-pink-700" };

type Props = {
  // Already filtered AND frozen by the page: this array must only change when the filters change,
  // never on a vote. See the page's `deckFoods` memo for why.
  foods: Food[];
  canEdit: boolean;
  statusOf: (foodId: string) => Status | undefined;
  isFav: (foodId: string) => boolean;
  onVote: (foodId: string, status: Status | null, favorite: boolean) => void;
  onToggleFavorite: (foodId: string) => void;
  onBlocked: () => void;
  onClearFilters: () => void;
};

// The whole "Mes goûts" surface: the card stack, the filmstrip under it, and the vote bar. Unlike
// the onboarding SwipeDeck (a one-way funnel) this is an editor — you can jump anywhere, re-vote a
// card you already answered, and undo back to the previous value.
export function TasteDeck({
  foods,
  canEdit,
  statusOf,
  isFav,
  onVote,
  onToggleFavorite,
  onBlocked,
  onClearFilters,
}: Props) {
  // The current card is tracked by ID, not by index, and the index is DERIVED at render. That is
  // what lets search/filters rebuild `foods` without the deck jumping or flashing: if the food is
  // still in the new list we stay on it, otherwise we fall back to the top.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  // The strip's thumbnails swell and pop UP over the card area while scrubbing, and the card paints
  // above them — so the card gives back 20px from its bottom edge to clear the way.
  const [stripOpen, setStripOpen] = useState(false);
  const history = useRef<{ foodId: string; prevStatus: Status | null; prevFavorite: boolean }[]>([]);
  const [, force] = useState(0);
  const topRef = useRef<SwipeCardHandle>(null);
  const stripSyncRef = useRef<HTMLDivElement | null>(null);

  // Slide the filmstrip while the card is dragged, so the two move together. The picker stays put in
  // the centre and the THUMBNAILS travel LEFT — exactly as if the strip were scrolling on to the next
  // food, which is what the swipe is about to do. Same motion whatever the direction of the drag (up,
  // down, left, right), driven by the drag DISTANCE rather than the signed dx. Snapped back on release
  // (a commit re-centres it via the index change).
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

  const found = anchor ? foods.findIndex((f) => f.id === anchor) : -1;
  const cursor = found >= 0 ? found : 0;

  // A new working set is a fresh run: an old "tout est réglé" must not stick.
  useEffect(() => {
    setFinished(false);
    setFlippedId(null);
  }, [foods]);

  function goTo(i: number) {
    setAnchor(foods[i]?.id ?? null);
    setFinished(false);
    setFlippedId(null);
  }

  function handleCommit(i: number, dir: SwipeDir) {
    const food = foods[i];
    if (!food) return;
    const prevStatus = statusOf(food.id) ?? null;
    const prevFavorite = isFav(food.id);
    // Carry the current favourite through: the API coerces a missing `favorite` to false and always
    // writes the column, so voting on a coup de cœur would silently drop it.
    const { status, favorite } = dirToPref(dir, prevFavorite);
    onVote(food.id, status, favorite);
    history.current.push({ foodId: food.id, prevStatus, prevFavorite });
    setFlippedId(null);
    // ALWAYS advance. A card that flew out keeps its off-screen transform, so it must leave the
    // rendered slice and remount when you come back to it — staying put would show a blank slot.
    const next = foods[i + 1];
    if (next) setAnchor(next.id);
    else {
      setFinished(true);
      void haptic("success"); // last card of the selection answered
    }
    force((n) => n + 1);
  }

  function undo() {
    const last = history.current.pop();
    if (!last) return;
    // Restore the PREVIOUS value rather than clearing: on this screen you re-vote foods that were
    // already answered, so "undo" means "put it back how it was".
    onVote(last.foodId, last.prevStatus, last.prevFavorite);
    setAnchor(last.foodId);
    setFinished(false);
    setFlippedId(null);
    force((n) => n + 1);
  }

  function vote(dir: SwipeDir) {
    if (!canEdit) {
      onBlocked();
      return;
    }
    topRef.current?.commit(dir);
  }

  function setVariant(vid: string, status: Status) {
    if (!canEdit) {
      onBlocked();
      return;
    }
    // A plain button, so re-tapping the active one clears it (the swipe gestures can't express that).
    onVote(vid, statusOf(vid) === status ? null : status, false);
  }

  if (foods.length === 0) {
    return (
      <Panel
        emoji="🤷"
        title="Aucun aliment ici"
        body="Aucun aliment ne correspond à cette recherche ou à ce filtre."
        action="Tout afficher"
        onAction={onClearFilters}
      />
    );
  }

  return (
    <>
      <style>{VOTE_STYLE}</style>
      <style>{CARD_FLIP_STYLE}</style>

      {/* Card area — a capped, responsive height (not flex-1) so the card is ~15% smaller than full;
          the spacer below eats the rest and keeps the strip + vote bar low. Narrow side padding too. */}
      <div
        className="relative mx-auto min-h-0 w-full max-w-sm shrink-0 px-6 pb-0.5"
        // Read-only: SwipeCard already refuses the drag (interactive={... && canEdit}) but it does so
        // SILENTLY, which just reads as a broken card. The press bubbles up to here, so this is where
        // we explain it. Buttons on the card (heart, "préciser") answer for themselves.
        onPointerDown={
          canEdit
            ? undefined
            : (e) => {
                if ((e.target as HTMLElement).closest("button, a")) return;
                onBlocked();
              }
        }
        style={{
          // Shrinks from the BOTTOM (the flex spacer below absorbs it, so nothing else moves) to
          // uncover the swollen filmstrip. Deliberate height transition: it runs twice per scrub, on
          // one container, never per frame.
          height: `calc(clamp(260px, 52vh, 26rem) - ${stripOpen ? 30 : 0}px)`,
          transition: "height 220ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="relative h-full w-full">
          {/* End of the selection. The deck stops here — it does NOT wrap back to the first card.
              Deliberately NOT a full-screen panel: the filmstrip below stays mounted so you can
              still scrub back to any food. The button is the only way back to the top, and it
              disappears the moment you press it. */}
          {finished && (
            <div className="pop absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-[var(--card-border)] bg-[var(--surface)] px-6 text-center">
              <span className="text-5xl" aria-hidden>🎉</span>
              <p className="text-xl font-extrabold text-stone-800">Tout est réglé&nbsp;!</p>
              <p className="text-sm font-semibold text-stone-500">
                Tu as parcouru tous les aliments de cette sélection. Utilise la barre du bas pour revenir sur un
                aliment.
              </p>
              <button
                type="button"
                onClick={() => goTo(0)}
                className="btn-3d btn-primary mt-1 rounded-full px-5 py-2.5 text-sm"
              >
                Revenir au début
              </button>
            </div>
          )}
          {foods.slice(cursor, cursor + 3).map((food, i) => {
            const gi = cursor + i;
            const top = i === 0;
            const variants = variantsFor(food.category);
            const flipped = top && flippedId === food.id;
            const st = statusOf(food.id);
            const fav = isFav(food.id);
            // Favourite -> "Coup de cœur"; otherwise the plain vote status. Shown above the title.
            const pill: Pill | null = fav ? COUP_PILL : st ? STATUS_PILL[st] : null;
            return (
              <SwipeCard
                key={food.id}
                ref={top ? topRef : undefined}
                data={cardData(food)}
                stackIndex={i}
                interactive={top && canEdit && !flipped}
                onCommit={(dir) => handleCommit(gi, dir)}
                glyph={GLYPH}
                flipped={flipped}
                dim={!top && flippedId != null}
                titleOnTop
                flatStack
                onDragMove={top ? onCardDrag : undefined}
                onDragEnd={top ? onCardDragEnd : undefined}
                // The slots depend on the FOOD, never on its stack position: a card promoted from the
                // stack to the top must not restructure its DOM mid-animation.
                topRight={
                  <button
                    type="button"
                    onClick={() => (canEdit ? onToggleFavorite(food.id) : onBlocked())}
                    aria-pressed={fav}
                    aria-label={fav ? `Retirer ${food.label} des coups de cœur` : `${food.label} en coup de cœur`}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill={fav ? "#ec4899" : "none"}
                      stroke={fav ? "#ec4899" : "#d6d3d1"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                }
                footer={
                  <div className="flex flex-col items-center gap-1.5 pb-1">
                    {/* Vote-status tag at the BOTTOM of the card ("Coup de cœur" for favourites). */}
                    {pill && (
                      <span
                        className={`flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs font-extrabold ${pill.className}`}
                      >
                        <Icon name={pill.icon} size={14} strokeWidth={2.4} />
                        {pill.label}
                      </span>
                    )}
                    {variants.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFlippedId(flippedId === food.id ? null : food.id)}
                        className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-1.5 text-sm font-bold text-[var(--primary)] transition active:scale-95"
                      >
                        {/* No icon: a fork-and-knife glyph at this size renders as mush — the chip
                            is clearer without it. */}
                        Préciser la forme
                      </button>
                    )}
                  </div>
                }
                back={
                  variants.length > 0 ? (
                    // p-4, not the front's p-6: 7 variant rows need every pixel.
                    <div className="flex h-full w-full flex-col gap-2 p-4">
                      <div className="flex shrink-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xl font-extrabold text-stone-900">
                            {food.label}
                          </div>
                          <div className="text-[14px] font-semibold text-stone-400">
                            Sous quelle forme&nbsp;?
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFlippedId(null)}
                          aria-label="Fermer les précisions"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition active:scale-90"
                        >
                          <Icon name="x" size={16} strokeWidth={2.6} />
                        </button>
                      </div>
                      {/* pan-y so this list scrolls: the card root sets touch-action none while it is
                          draggable, and an ancestor's `none` vetoes a descendant's panning. */}
                      <div
                        className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1"
                        style={{ touchAction: "pan-y" }}
                      >
                        {variants.map((v) => {
                          const vid = `${food.id}#${v.key}`;
                          const vst = statusOf(vid);
                          return (
                            <div key={v.key} className="flex items-center justify-between gap-2">
                              <span className="line-clamp-2 min-w-0 flex-1 text-[16px] font-semibold leading-[1.15] text-stone-600">
                                {v.label}
                              </span>
                              <div className="flex shrink-0 gap-2.5">
                                <VoteButton
                                  size="sm"
                                  tone="red"
                                  icon="thumbs-down"
                                  active={vst === "N"}
                                  onClick={() => setVariant(vid, "N")}
                                  label={`${v.label} : aime pas`}
                                />
                                <VoteButton
                                  size="sm"
                                  tone="amber"
                                  icon="meh"
                                  active={vst === "M"}
                                  onClick={() => setVariant(vid, "M")}
                                  label={`${v.label} : moyen`}
                                />
                                <VoteButton
                                  size="sm"
                                  tone="green"
                                  icon="thumbs-up"
                                  active={vst === "O"}
                                  onClick={() => setVariant(vid, "O")}
                                  label={`${v.label} : aime`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </div>

      {/* Absorbs the height freed by capping the card, so the strip + vote bar stay pinned low. */}
      <div className="min-h-0 flex-1" />

      <FoodFilmstrip
        foods={foods}
        index={cursor}
        statusOf={statusOf}
        favoriteOf={isFav}
        emojiOf={(f) => CAT[f.category]?.emoji ?? "🍽️"}
        onPick={goTo}
        onScrubChange={setStripOpen}
        syncRef={stripSyncRef}
      />

      {/* Above the cards (z-40) with no opaque block, so a card swiped down slides under it.
          items-end lines the small buttons up with the BOTTOM edge of the two big ones. Small bottom
          padding drops the buttons as low as they go before the physical edge. */}
      <div className="relative z-40 flex shrink-0 items-end justify-center gap-1.5 px-1 pb-1 pt-2">
        {/* Each button gets its own buzz strength so a vote FEELS like what it is. */}
        {/* `locked` (read-only) greys them out but KEEPS the click, so the tap can be explained.
            `disabled` (end of deck) is the real thing: there is no card left to vote on. */}
        <VoteButton
          tone="neutral"
          icon="undo"
          label="Revenir en arrière"
          disabled={history.current.length === 0}
          locked={!canEdit}
          onClick={undo}
          buzz="light"
        />
        <VoteButton tone="red" icon="thumbs-down" size="big" label="J'aime pas" locked={!canEdit} disabled={finished} onClick={() => vote("nope")} buzz="medium" />
        <VoteButton tone="amber" icon="meh" label="Moyen / Tolère" locked={!canEdit} disabled={finished} onClick={() => vote("moyen")} buzz="light" />
        <VoteButton tone="green" icon="thumbs-up" size="big" label="J'aime" locked={!canEdit} disabled={finished} onClick={() => vote("like")} buzz="medium" />
        <VoteButton tone="pink" icon="heart" label="Coup de cœur" locked={!canEdit} disabled={finished} onClick={() => vote("super")} buzz="success" />
      </div>
    </>
  );
}

// No subtitle: the onboarding deck explains each food with FOOD_DESC because you're meeting them for
// the first time. Here you're revisiting your own tastes, so the card stays down to the glyph and the
// name — the description was just noise on a card this size.
function cardData(f: Food): SwipeCardData {
  // iconName is only used when the food has no photo (custom foods) -> show its category icon.
  return { id: f.id, title: f.label, emoji: CAT[f.category]?.emoji ?? "🍽️", iconName: CAT[f.category]?.icon };
}

function Panel({
  emoji,
  title,
  body,
  action,
  onAction,
}: {
  emoji: string;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="text-5xl" aria-hidden>
        {emoji}
      </div>
      <p className="mt-2 text-lg font-extrabold text-stone-800">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{body}</p>
      <button type="button" onClick={onAction} className="btn-3d btn-primary mt-4 rounded-full px-5 py-2.5 text-sm">
        {action}
      </button>
    </div>
  );
}
