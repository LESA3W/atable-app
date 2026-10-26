"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import { useFamily } from "@/components/ProfileProvider";
import { SearchInput } from "@/components/SearchInput";
import { CategoryPicker, ALL_CATEGORIES } from "@/components/CategoryPicker";
import { TasteDeck } from "@/components/TasteDeck";
import { Icon } from "@/components/Icon";
import { apiFetch } from "@/lib/api";
import { CATEGORIES, FOODS, categoryRank, popularityRank } from "@/data/foods";
import { matchesQuery } from "@/lib/search";
import { restrictionsToExcludes } from "@/lib/diets";
import type { CustomFood, Food, PreferenceMap, Status } from "@/lib/types";

type FilterId = "tous" | Status | "unset" | "favoris";
const FILTERS: { id: FilterId; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "favoris", label: "Favoris" },
  { id: "O", label: "Aime" },
  { id: "M", label: "Moyen" },
  { id: "N", label: "Aime pas" },
  { id: "unset", label: "Non renseigné" },
];

export default function PreferencesPage() {
  // `me` is the logged-in member (identity). Browsing another member is a LOCAL view
  // and must NOT change the identity.
  const { me, members, memberLabel } = useFamily();
  const router = useRouter();
  const [viewedPerson, setViewedPerson] = useState<string>(me.id);
  useEffect(() => {
    setViewedPerson(me.id);
  }, [me.id]);
  const person = viewedPerson;
  const [prefs, setPrefs] = useState<PreferenceMap>({});
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("tous");
  const [cat, setCat] = useState<string>(ALL_CATEGORIES);
  const [filterOpen, setFilterOpen] = useState(false);
  const [blocked, setBlocked] = useState(false); // read-only explainer, opened by a blocked vote/swipe
  const [favorites, setFavorites] = useState<Record<string, string[]>>({}); // person -> favorite food ids
  const [loading, setLoading] = useState(true);

  // Add-food sheet
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCat, setNewCat] = useState(CATEGORIES[0].id);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/api/preferences").then((r) => r.json()),
      apiFetch("/api/foods").then((r) => r.json()),
      apiFetch("/api/preferences/favorites").then((r) => r.json()),
    ])
      .then(([p, f, fav]: [PreferenceMap, CustomFood[], Record<string, string[]>]) => {
        setPrefs(p ?? {});
        setCustomFoods(Array.isArray(f) ? f : []);
        setFavorites(fav ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mine = prefs[person] ?? {};
  const viewedMember = members.find((p) => p.id === person);
  // An account member manages their OWN tastes on their own app -> read-only here. A managed profile
  // (no account) can be edited by anyone in the famille/groupe.
  const canEdit = person === me.id || !viewedMember?.hasAccount;

  const allFoods: Food[] = useMemo(
    () => [...FOODS, ...customFoods.map((c) => ({ id: c.id, label: c.label, category: c.category }))],
    [customFoods],
  );

  const excluded = useMemo(
    () => new Set(restrictionsToExcludes(viewedMember?.restrictions ?? [])),
    [viewedMember?.restrictions],
  );

  function statusOf(foodId: string): Status | undefined {
    return prefs[person]?.[foodId];
  }
  function isFav(foodId: string): boolean {
    return (favorites[person] ?? []).includes(foodId);
  }

  // One write path for every taste change: a swipe, a vote button, the heart, a "préciser" form.
  // `favorite` is ALWAYS sent — the API coerces a missing one to false and its ON CONFLICT always
  // writes the column, so omitting it silently drops a coup de cœur.
  async function vote(foodId: string, status: Status | null, favorite: boolean) {
    if (!canEdit) {
      setBlocked(true); // explain instead of saving
      return;
    }
    const prevStatus = prefs[person]?.[foodId];
    const prevFav = isFav(foodId);

    setPrefs((prev) => {
      const personMap = { ...(prev[person] ?? {}) };
      if (status === null) delete personMap[foodId];
      else personMap[foodId] = status;
      return { ...prev, [person]: personMap };
    });
    setFavorites((prev) => {
      const list = new Set(prev[person] ?? []);
      // Clearing the status deletes the row, so the favourite goes with it.
      if (favorite && status !== null) list.add(foodId);
      else list.delete(foodId);
      return { ...prev, [person]: [...list] };
    });

    try {
      const res = await apiFetch("/api/preferences", {
        method: "POST",
        body: JSON.stringify({ person, foodId, status, favorite }),
      });
      if (!res.ok) throw new Error("save_failed");
    } catch {
      // Roll the optimistic change back so the UI matches what was actually saved.
      setPrefs((prev) => {
        const personMap = { ...(prev[person] ?? {}) };
        if (prevStatus == null) delete personMap[foodId];
        else personMap[foodId] = prevStatus;
        return { ...prev, [person]: personMap };
      });
      setFavorites((prev) => {
        const list = new Set(prev[person] ?? []);
        if (prevFav) list.add(foodId);
        else list.delete(foodId);
        return { ...prev, [person]: [...list] };
      });
    }
  }

  // A favourite implies a status, so default an unset food to "Aime".
  function toggleFavorite(foodId: string) {
    vote(foodId, (prefs[person]?.[foodId] ?? "O") as Status, !isFav(foodId));
  }

  async function addFood(e: FormEvent) {
    e.preventDefault();
    setAddError("");
    const label = newLabel.trim();
    if (label.length < 2) {
      setAddError("Nom trop court");
      return;
    }
    try {
      const res = await apiFetch("/api/foods", {
        method: "POST",
        body: JSON.stringify({ label, category: newCat }),
      });
      if (!res.ok) {
        setAddError("Impossible d'ajouter cet aliment");
        return;
      }
      const food: CustomFood = await res.json();
      setCustomFoods((prev) => [...prev, food]);
      setNewLabel("");
      setAdding(false);
    } catch {
      setAddError("Erreur réseau");
    }
  }

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const favRef = useRef(favorites);
  favRef.current = favorites;

  // The deck's WORKING SET. Deliberately frozen until a filter changes: it reads prefs/favorites
  // through refs so a vote never rebuilds it. If it did, then under filter="unset" the food you just
  // answered would drop out, every later index would shift down by one, and the deck — which
  // advances to index+1 — would silently skip the next card. Freezing also reads better: the
  // filmstrip fills with colour as you vote instead of emptying under your finger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deckFoods = useMemo(() => {
    const mineNow = prefsRef.current[person] ?? {};
    const favNow = new Set(favRef.current[person] ?? []);
    const list = allFoods.filter((f) => {
      if (excluded.has(f.category)) return false;
      if (cat !== ALL_CATEGORIES && f.category !== cat) return false;
      if (!matchesQuery(f.label, search)) return false;
      const st = mineNow[f.id];
      if (filter === "tous") return true;
      if (filter === "favoris") return favNow.has(f.id);
      if (filter === "unset") return !st;
      return st === filter;
    });
    // Not-yet-rated foods come first, then by category priority (whole dishes before raw ingredients
    // — see CATEGORY_ORDER in data/foods), then catalogue order (the sort is stable). Computed at
    // build time only — the working set is frozen while you vote, so it doesn't reshuffle live.
    return list.sort(
      (a, b) =>
        (mineNow[a.id] ? 1 : 0) - (mineNow[b.id] ? 1 : 0) ||
        categoryRank(a.category) - categoryRank(b.category) ||
        popularityRank(a.id) - popularityRank(b.id),
    );
  }, [allFoods, excluded, cat, search, filter, person]);

  const counts = useMemo(() => {
    let done = 0;
    for (const f of allFoods) if (mine[f.id]) done++;
    return { done, total: allFoods.length };
  }, [mine, allFoods]);

  const activeName = viewedMember?.name ?? memberLabel(person);

  function clearFilters() {
    setSearch("");
    setFilter("tous");
    setCat(ALL_CATEGORIES);
  }

  return (
    // A card deck must not fight page scroll: this screen is exactly one viewport, never scrolls, and
    // the deck takes whatever height the controls leave. On mobile /preferences owns its whole header
    // (no external back bar), so the deck is a full 100dvh; -mt-5 reclaims <main>'s pt-5 and -mb its pb
    // so it runs edge to edge. On desktop the orange header shows, so subtract --header-h there.
    <div className="-mb-[var(--bottomnav-space)] -mt-5 flex h-[100dvh] flex-col overflow-hidden pb-[26px] md:mb-0 md:h-[calc(100dvh-var(--header-h)-3rem)] md:pb-0">
      {/* Own header: back chevron (Repas-sized) + the "X/Y done" counter + a progress bar of how many
          foods are rated (filled) vs not (track) — like the Repas wizard. No page title. */}
      <div className="flex shrink-0 items-center gap-2.5 pb-1 pt-[calc(env(safe-area-inset-top)+8px)] md:pt-2">
        <button
          type="button"
          onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/semaine"))}
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition active:scale-90 md:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--primary-soft)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500 ease-out"
            style={{ width: `${counts.total ? Math.round((counts.done / counts.total) * 100) : 0}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-extrabold tabular-nums text-stone-500" aria-label={`${counts.done} sur ${counts.total} aliments réglés`}>
          {counts.done}/{counts.total}
        </span>
      </div>

      {/* Who am I looking at. A horizontal strip, not a grid: on a one-viewport screen every row
          spent here comes straight out of the card's height. */}
      <div className="-mx-4 shrink-0 overflow-x-auto px-4 py-1">
        <div className="flex w-max gap-2">
          {members.map((p) => {
            const active = p.id === person;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setViewedPerson(p.id)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 py-1 pl-1 pr-3 text-[13px] font-bold transition active:scale-95 ${
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                <Avatar person={p} size={26} />
                {p.name}
              </button>
            );
          })}
          <Link
            href="/famille"
            aria-label="Ajouter un compte"
            className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-orange-300 bg-orange-50/40 py-1 pl-1 pr-3 text-[13px] font-bold text-orange-700 transition active:scale-95"
          >
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <Icon name="user-plus" size={15} />
            </span>
            Ajouter un compte
          </Link>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 pb-1">
        {/* items-stretch so the Ajouter button is exactly as tall as the search field beside it. */}
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher…"
              ariaLabel="Rechercher un aliment"
            />
          </div>
          {/* Flat (not btn-3d): the 3D bottom shadow would overshoot the search field's bottom edge.
              border-2 + items-stretch makes it the EXACT same box as the search field beside it. */}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary)] px-4 text-sm font-extrabold text-white transition active:brightness-90"
          >
            <Icon name="plus-circle" size={18} /> Ajouter
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <CategoryPicker value={cat} onChange={setCat} allowAll compact />
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
              className="flex items-center gap-1.5 rounded-full border-2 border-stone-200 bg-white px-3 py-1.5 text-[13px] font-bold text-stone-700 transition active:scale-95"
            >
              <span className="text-stone-400">Trier par&nbsp;:</span>
              {FILTERS.find((f) => f.id === filter)?.label ?? "Tous"}
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className={`text-stone-400 transition-transform ${filterOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {filterOpen && (
              <>
                <span className="fixed inset-0 z-30" aria-hidden onClick={() => setFilterOpen(false)} />
                <div
                  role="listbox"
                  className="pop absolute right-0 top-full z-40 mt-1.5 w-52 overflow-hidden rounded-2xl border-2 border-stone-100 bg-white p-1.5 shadow-[0_16px_40px_rgba(43,42,40,0.18)]"
                >
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="option"
                      aria-selected={filter === f.id}
                      onClick={() => {
                        setFilter(f.id);
                        setFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition active:scale-[0.98] ${
                        filter === f.id ? "bg-orange-50 text-orange-700" : "text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      {f.label}
                      {filter === f.id && <Icon name="check-circle" size={16} strokeWidth={2.4} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 pb-3">
          <Skeleton className="mx-auto w-full max-w-sm flex-1 rounded-[28px]" />
          <Skeleton className="h-14 shrink-0" />
        </div>
      ) : (
        <TasteDeck
          foods={deckFoods}
          canEdit={canEdit}
          statusOf={statusOf}
          isFav={isFav}
          onVote={vote}
          onToggleFavorite={toggleFavorite}
          onBlocked={() => setBlocked(true)}
          onClearFilters={clearFilters}
        />
      )}

      {/* Read-only explainer. Replaces the old grey banner under the profile picker: a tap or a swipe
          that does nothing needs an answer on the spot, not a hint somewhere up the page. */}
      {blocked && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-6"
          onClick={() => setBlocked(false)}
        >
          <div
            className="modal-in w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-[0_20px_50px_rgba(43,42,40,0.28)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <span className="text-4xl" aria-hidden>🔒</span>
            <p className="mt-2 text-lg font-extrabold text-stone-800">
              Les goûts de {activeName} sont verrouillés
            </p>
            <p className="mt-1.5 text-sm font-semibold text-stone-500">
              {activeName}
              {" a son propre compte À table : ces goûts ne se modifient que depuis son téléphone. "}
              Ici tu peux seulement les consulter.
            </p>
            <button
              type="button"
              onClick={() => setBlocked(false)}
              className="btn-3d btn-primary mt-4 w-full py-3 text-base"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}

      {adding && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setAdding(false)}
        >
          <form
            onSubmit={addFood}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-lg flex-col gap-2 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-3xl sm:pb-4"
          >
            <div className="flex items-center gap-1.5 font-bold text-stone-800">
              <Icon name="plus-circle" size={18} /> Ajouter un aliment à la liste
            </div>
            <input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              maxLength={60}
              placeholder="Ex : Tarte au citron"
              className="w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-base outline-none focus:border-orange-300"
            />
            <CategoryPicker value={newCat} onChange={setNewCat} />
            {addError && <p className="text-sm font-semibold text-red-600">{addError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-3d btn-primary rounded-full px-4 py-2 text-sm">
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setAddError("");
                }}
                className="btn-3d btn-neutral rounded-full px-4 py-2 text-sm"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
