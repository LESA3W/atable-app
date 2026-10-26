"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { apiFetch } from "@/lib/api";
import { useFamily } from "@/components/ProfileProvider";
import { Spinner } from "@/components/Spinner";
import { Skeleton } from "@/components/Skeleton";
import { Icon } from "@/components/Icon";
import { PremiumOverlay, usePremium } from "@/components/PremiumGate";
import { Avatar } from "@/components/Avatar";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { ProductRow } from "@/components/shopping/ProductRow";
import { BudgetSlider } from "@/components/shopping/BudgetSlider";
import { PartnerModal } from "@/components/PartnerModal";
import { fetchDriveMarkets, hydrateAddresses, marketFromKey, marketsOf, type Market } from "@/lib/shopping";
import { estimateByDish, euro } from "@/lib/estimate";
import { dishImage } from "@/data/dish-images";
import { mondayOf, nearestPlannedWeekOffset, weekOffsetOfDate, weekRangeLabel, ymdOf } from "@/lib/week";
import { setSeenWeek, unseenCount, weekKeys, weekMonday } from "@/lib/cartSeen";
import type { MealPlanEntry } from "@/lib/types";
import { haptic, useChangeHaptic } from "@/lib/native";

const STORE_LS = "atable.courses.store";
const BUDGET_LS = "atable.courses.budget";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weekDays(offset: number): string[] {
  const now = new Date();
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)));
}

const COURSE_EMOJI: Record<string, string> = { entree: "🥗", plat: "🍲", dessert: "🍰" };
const EASE = [0.23, 1, 0.32, 1] as const; // app's --ease-out (Emil Kowalski)

type Mode = "magasin" | "drivelivraison";
const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "magasin", label: "En magasin", icon: "storefront" },
  { id: "drivelivraison", label: "Drive / Livraison", icon: "car" },
];

type Confirm = { title: string; message: string; onConfirm: () => void } | null;

export default function CoursesPage() {
  const { me, members } = useFamily();
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [wideEntries, setWideEntries] = useState<MealPlanEntry[]>([]); // 4-week plan, kept to score unseen per week
  const [seenTick, setSeenTick] = useState(0); // bumped when a week is marked seen -> recompute the arrow badges
  const base = useMemo(() => new Date(), []); // stable "now" for the session's week math
  const [peopleBubble, setPeopleBubble] = useState<string | null>(null); // dish key whose diners' names are shown
  const [overrides, setOverrides] = useState<Record<string, { qty: number | null; brand: string | null }>>({}); // per-product qty/brand tweaks
  const [budgetLevel, setBudgetLevel] = useState(0.5); // 0=cheapest brands, .5=median (default), 1=priciest — browser-local only
  const reduce = useReducedMotion();
  const locked = !usePremium(); // trial lapsed -> the list value is blurred behind the offer
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("magasin");
  const [storeKey, setStoreKey] = useState<string | null>(null);
  const [nearby, setNearby] = useState<Market[] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [pending, setPending] = useState<Market | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [switching, setSwitching] = useState(false);
  // Products family members manually ask to add to the list ("Les produits demandés").
  type Req = { id: string; memberId: string; label: string; brand: string | null; qty: number; checked: boolean };
  const [requests, setRequests] = useState<Req[]>([]);
  const [newProduct, setNewProduct] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [addingReq, setAddingReq] = useState(false);
  const [collapsedReq, setCollapsedReq] = useState<Set<string>>(new Set()); // requester groups folded (default: all open)

  const [savedHydrated, setSavedHydrated] = useState<Market[] | null>(null);
  const days = useMemo(() => weekDays(weekOffset), [weekOffset]);
  const weekStart = days[0];
  const savedMarkets = useMemo(() => marketsOf(me?.shopping).map(marketFromKey), [me?.shopping]);
  const householdSize = members.length || 2;

  // Saved shops carry only name + coords, so backfill their street address for the cards.
  useEffect(() => {
    let alive = true;
    hydrateAddresses(savedMarkets).then((ms) => alive && setSavedHydrated(ms));
    return () => {
      alive = false;
    };
  }, [savedMarkets]);

  // The estimation store is picked from the shops AROUND the user (like Drive), remembered
  // across sessions. Falls back to the saved shops while nearby loads / if location is unknown.
  const allOptions = nearby && nearby.length > 0 ? nearby : savedHydrated ?? savedMarkets;
  // En magasin -> only walk-in stores; Drive/Livraison -> only those that do Drive or Livraison.
  const options = allOptions.filter((m) => (mode === "magasin" ? m.physical : m.services.length > 0));
  const store = options.find((m) => m.key === storeKey) ?? options[0] ?? null;

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE_LS);
      if (s) setStoreKey(s);
    } catch {
      /* private mode */
    }
  }, []);
  function pickStore(key: string) {
    setStoreKey(key);
    try {
      localStorage.setItem(STORE_LS, key);
    } catch {
      /* ignore */
    }
  }

  // Budget slider level: a personal, browser-local choice (not per-week, not shared).
  useEffect(() => {
    try {
      const v = localStorage.getItem(BUDGET_LS);
      if (v != null) setBudgetLevel(Math.max(0, Math.min(1, Number(v) || 0.5)));
    } catch {
      /* private mode */
    }
  }, []);
  function changeBudget(t: number) {
    const c = Math.max(0, Math.min(1, t));
    setBudgetLevel(c);
    try {
      localStorage.setItem(BUDGET_LS, String(c));
    } catch {
      /* ignore */
    }
  }

  // The whole shopping state (meals, done flag, requests + everyone's tick marks) lives on the
  // server so it's shared. Re-fetched on open, on week change, and on a 60s poll so two people
  // shopping at once stay in sync (a checked item / a new request shows up for the other).
  const loadAll = useCallback(
    async (spinner: boolean) => {
      if (spinner) setLoading(true);
      try {
        const [planRes, doneRes, reqRes, checkRes, removedRes, ovRes] = await Promise.all([
          apiFetch(`/api/meal-plan?from=${days[0]}&to=${days[6]}`),
          apiFetch(`/api/shopping-done?week=${weekStart}`),
          apiFetch(`/api/shopping-requests`),
          apiFetch(`/api/shopping-checks?week=${weekStart}`),
          apiFetch(`/api/shopping-removed?week=${weekStart}`),
          apiFetch(`/api/shopping-overrides?week=${weekStart}`),
        ]);
        const plan = await planRes.json();
        const d = await doneRes.json().catch(() => ({}));
        const rq = await reqRes.json().catch(() => ({}));
        const ch = await checkRes.json().catch(() => ({}));
        const rm = await removedRes.json().catch(() => ({}));
        const ov = await ovRes.json().catch(() => ({}));
        setEntries(Array.isArray(plan) ? plan : []);
        setDone(!!d?.done);
        setRequests(Array.isArray(rq?.requests) ? rq.requests : []);
        setChecked(new Set(Array.isArray(ch?.checked) ? ch.checked : []));
        // Removals live on the server now (shared + persisted); a deleted item stays gone.
        setRemoved(new Set(Array.isArray(rm?.removed) ? rm.removed : []));
        setOverrides(ov?.overrides && typeof ov.overrides === "object" ? ov.overrides : {});
      } catch {
        /* keep the current state on a failed poll */
      } finally {
        if (spinner) setLoading(false);
      }
    },
    [days, weekStart],
  );

  useEffect(() => {
    loadAll(true); // removals come from the server (loadAll sets them), no local reset
  }, [loadAll]);

  // On open, jump to the nearest week that actually has meals (matches the header cart), so planning
  // for next week doesn't leave you staring at an empty current week. Runs once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const base = new Date();
        const from = ymdOf(mondayOf(0, base));
        const to = ymdOf(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 27));
        const res = await apiFetch(`/api/meal-plan?from=${from}&to=${to}`);
        const data = await res.json();
        const wide: MealPlanEntry[] = Array.isArray(data) ? data : [];
        const off = nearestPlannedWeekOffset(wide.map((e) => e.date), base);
        if (!alive) return;
        setWideEntries(wide);
        setWeekOffset(off);
      } catch {
        /* no family / offline -> stay on the current week */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Live sync: refresh the shared list every 60s for everyone.
  useEffect(() => {
    const id = window.setInterval(() => loadAll(false), 60000);
    return () => window.clearInterval(id);
  }, [loadAll]);

  // Coming BACK to this page (tab switch / back button / PWA reopen — where iOS may restore a stale
  // page without remounting) refreshes the list AND re-checks the nearest planned week, so a meal you
  // just added elsewhere shows up instead of a frozen empty week. Only auto-jumps when the week you're
  // on has nothing (never overrides a manual week choice that already has meals).
  useEffect(() => {
    const resync = async () => {
      loadAll(false);
      try {
        const b = new Date();
        const from = ymdOf(mondayOf(0, b));
        const to = ymdOf(new Date(b.getFullYear(), b.getMonth(), b.getDate() + 27));
        const res = await apiFetch(`/api/meal-plan?from=${from}&to=${to}`);
        const data = await res.json();
        const w: MealPlanEntry[] = Array.isArray(data) ? data : [];
        setWideEntries(w);
        const curHasMeals = w.some((e) => weekOffsetOfDate(e.date, b) === weekOffset);
        if (!curHasMeals) setWeekOffset(nearestPlannedWeekOffset(w.map((e) => e.date), b));
      } catch {
        /* offline — keep current state */
      }
    };
    const onVis = () => {
      if (!document.hidden) resync();
    };
    window.addEventListener("focus", resync);
    window.addEventListener("pageshow", resync);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", resync);
      window.removeEventListener("pageshow", resync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadAll, weekOffset]);

  // Nearby shops (with distance + address). Re-fetched every time the page opens (fresh mount) and
  // whenever the user's location changes — the shops around can change, so always reload them.
  useEffect(() => {
    const lat = me?.shopping?.lat;
    const lon = me?.shopping?.lon;
    if (lat == null || lon == null) return;
    let alive = true;
    setNearbyLoading(true);
    fetchDriveMarkets(lat, lon)
      .then((ms) => alive && setNearby(ms))
      .catch(() => alive && setNearby([]))
      .finally(() => alive && setNearbyLoading(false));
    return () => {
      alive = false;
    };
  }, [me?.shopping?.lat, me?.shopping?.lon]);

  // The list, grouped by planned dish (each meal + its own products). A product's key is
  // `${dishKey}|${foodId}` so the same food under two different dishes stays independent for
  // ticking / removing / the header badge.
  const qtyOverrides = useMemo(() => {
    const o: Record<string, number> = {};
    for (const [k, v] of Object.entries(overrides)) if (v.qty != null) o[k] = v.qty;
    return o;
  }, [overrides]);
  const brandOverrides = useMemo(() => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(overrides)) if (v.brand) o[k] = v.brand;
    return o;
  }, [overrides]);
  const dishGroupsRaw = useMemo(
    () => estimateByDish(entries, store?.name ?? null, householdSize, qtyOverrides, budgetLevel, brandOverrides),
    [entries, store?.name, householdSize, qtyOverrides, budgetLevel, brandOverrides],
  );
  const dishGroups = dishGroupsRaw
    .map((g) => ({ ...g, products: g.products.filter((p) => !removed.has(`${g.key}|${p.foodId}`)) }))
    .filter((g) => g.products.length > 0);
  const itemCount = dishGroups.reduce((n, g) => n + g.products.length, 0);
  const total = dishGroups.reduce((s, g) => s + g.products.reduce((a, p) => a + p.priceEur, 0), 0);
  const minTotal = dishGroups.reduce((s, g) => s + g.products.reduce((a, p) => a + p.minEur, 0), 0);
  const maxTotal = dishGroups.reduce((s, g) => s + g.products.reduce((a, p) => a + p.maxEur, 0), 0);
  // Progress for the sticky header: how many of the whole list (meal products + requested ones) are ticked.
  const doneCount =
    dishGroups.reduce((n, g) => n + g.products.filter((p) => checked.has(`${g.key}|${p.foodId}`)).length, 0) +
    requests.filter((r) => r.checked).length;
  const totalCount = itemCount + requests.length;
  // A haptic each time the estimated total moves, to the cent — dragging the budget slider from
  // cheapest to premium fires a run of them, one per change.
  useChangeHaptic(Math.round(total * 100));

  // Mark the displayed week as seen only once its products have actually been LOOKED AT — i.e. the user
  // scrolls down toward the list (or the page is short enough that everything is already on screen).
  // Landing on a week is not enough: the red "new" badge stays on the week name until this fires, then
  // clears (and with it, that week's share of the header cart + nav-arrow badges). Uses ALL of the
  // week's ingredient keys (not the removed-filtered list) to line up with the header's key space.
  useEffect(() => {
    if (loading) return;
    const markSeen = () => {
      let keys = weekKeys(entries, weekOffset, base);
      if (weekOffset === 0) keys = [...keys, ...requests.map((r) => r.id)];
      // Guard a transient where `entries` still holds the PREVIOUS week (during a week switch's refetch):
      // it would compute [] for this offset and (with the old overwrite) wipe the week's seen set,
      // resurrecting the badge. Never mark-seen with an empty set.
      if (!keys.length) return;
      setSeenWeek(weekMonday(weekOffset, base), keys);
      setSeenTick((t) => t + 1); // recompute the per-week unseen counts
      window.dispatchEvent(new Event("atable:cart-seen")); // header re-reads seen + drops its badge
    };
    const doc = document.documentElement;
    // Nothing to scroll (short list, all products already visible) -> counts as looked at right away.
    if (doc.scrollHeight - window.innerHeight < 120) {
      markSeen();
      return;
    }
    const startY = window.scrollY; // where the user arrived on this week
    let fired = false;
    const onScroll = () => {
      if (fired) return;
      const y = window.scrollY;
      const nearBottom = y + window.innerHeight >= doc.scrollHeight - 80;
      if (y > startY + 100 || nearBottom) {
        fired = true;
        window.removeEventListener("scroll", onScroll);
        markSeen();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [weekOffset, loading, entries, requests, base]);

  // Unseen (new, not-yet-viewed) product count per week offset (0..4), for the nav-arrow alerts.
  // Recomputed when the wide plan, the requests, or the seen map (via seenTick) change.
  const unseenByOffset = useMemo(() => {
    const map: Record<number, number> = {};
    const reqIds = requests.map((r) => r.id);
    for (let off = 0; off <= 4; off++) {
      let keys = weekKeys(wideEntries, off, base);
      if (off === 0) keys = [...keys, ...reqIds];
      map[off] = unseenCount(weekMonday(off, base), keys);
    }
    return map;
    // seenTick is an intentional recompute trigger (localStorage reads aren't reactive).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wideEntries, requests, base, seenTick]);
  // New products waiting in PAST weeks (badge on ◀) and in FUTURE weeks (badge on ▶).
  const backUnseen = useMemo(() => {
    let n = 0;
    for (let off = 0; off < weekOffset; off++) n += unseenByOffset[off] || 0;
    return n;
  }, [unseenByOffset, weekOffset]);
  const fwdUnseen = useMemo(() => {
    let n = 0;
    for (let off = weekOffset + 1; off <= 4; off++) n += unseenByOffset[off] || 0;
    return n;
  }, [unseenByOffset, weekOffset]);

  // Ticking an estimated product is shared: persist it so the whole family sees it (and the 60s poll picks it up).
  function toggleCheck(id: string) {
    const next = !checked.has(id);
    if (next) void haptic("light"); // satisfying tick when an item is checked off
    setChecked((s) => {
      const n = new Set(s);
      next ? n.add(id) : n.delete(id);
      return n;
    });
    apiFetch("/api/shopping-checks", { method: "POST", body: JSON.stringify({ week: weekStart, foodId: id, checked: next }) }).catch(() => {});
  }
  function removeItem(id: string) {
    void haptic("medium"); // delete (trash tap or swipe) = a firmer buzz than a plain tap
    setRemoved((s) => new Set(s).add(id));
    setChecked((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    // Persist the removal (shared + survives reload). Also drop any tick mark for it.
    apiFetch("/api/shopping-removed", { method: "POST", body: JSON.stringify({ week: weekStart, foodId: id, removed: true }) }).catch(() => {});
    if (checked.has(id)) {
      apiFetch("/api/shopping-checks", { method: "POST", body: JSON.stringify({ week: weekStart, foodId: id, checked: false }) }).catch(() => {});
    }
    window.dispatchEvent(new Event("atable:cart-seen")); // list shrank -> header recomputes the badge
  }
  // Change a product's pack quantity or its brand (shared + persisted). Optimistic.
  function setOverride(itemKey: string, patch: { qty?: number | null; brand?: string | null }) {
    setOverrides((cur) => ({
      ...cur,
      [itemKey]: {
        qty: patch.qty !== undefined ? patch.qty : cur[itemKey]?.qty ?? null,
        brand: patch.brand !== undefined ? patch.brand : cur[itemKey]?.brand ?? null,
      },
    }));
    apiFetch("/api/shopping-overrides", { method: "POST", body: JSON.stringify({ week: weekStart, itemKey, ...patch }) }).catch(() => {});
  }
  async function setWeekDone(next: boolean) {
    setConfirm(null);
    setDone(next);
    if (next) {
      void haptic("success"); // whole shopping list done — the big payoff moment
      setChecked(new Set());
      setRemoved(new Set());
      setRequests([]); // finishing empties the list, requested products included (server clears too)
    }
    try {
      await apiFetch("/api/shopping-done", { method: "POST", body: JSON.stringify({ week: weekStart, done: next }) });
      // Once the server has the flag, tell the header to refresh: empty the cart (done) or refill it (reopened).
      window.dispatchEvent(new Event("atable:cart-seen"));
    } catch {
      /* optimistic */
    }
  }
  // Any family member can add a product to the list; each request keeps who asked, a brand and a qty.
  async function addRequest(e: FormEvent) {
    e.preventDefault();
    const label = newProduct.trim();
    if (!label || addingReq) return;
    setAddingReq(true);
    try {
      const res = await apiFetch("/api/shopping-requests", {
        method: "POST",
        body: JSON.stringify({ label, brand: newBrand.trim() || null, qty: newQty }),
      });
      const j = await res.json();
      if (j?.request) setRequests((rs) => [...rs, j.request]);
      window.dispatchEvent(new Event("atable:cart")); // the header cart hops on this add too
      setNewProduct("");
      setNewBrand("");
      setNewQty(1);
    } catch {
      /* ignore */
    } finally {
      setAddingReq(false);
    }
  }
  function removeRequest(id: string) {
    void haptic("medium"); // delete = a firmer buzz than a plain tap
    setRequests((rs) => rs.filter((r) => r.id !== id));
    apiFetch(`/api/shopping-requests?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }
  // Ticking a requested product is shared too (persisted on the request row).
  function toggleCheckReq(id: string) {
    const next = !requests.find((r) => r.id === id)?.checked;
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, checked: next } : r)));
    apiFetch("/api/shopping-requests", { method: "PATCH", body: JSON.stringify({ id, checked: next }) }).catch(() => {});
  }
  // Switching mode re-filters the shops (physical vs drive/livraison); flash a short load so the
  // list visibly refreshes instead of silently swapping.
  function changeMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    setSwitching(true);
    window.setTimeout(() => setSwitching(false), 600);
  }
  function askComplete() {
    const inStore = mode === "magasin";
    setConfirm({
      title: inStore ? "Courses terminées ?" : "Commande effectuée ?",
      message: inStore
        ? "Es-tu sûr d'avoir tout pris ?"
        : "Es-tu sûr d'avoir bien validé ta commande sur le site ?",
      onConfirm: () => setWeekDone(true),
    });
  }

  const range = weekRangeLabel(days[0], days[6]);
  const weekLabel = weekOffset === 0 ? `Cette semaine (${range})` : range;
  const currentWeekUnseen = unseenByOffset[weekOffset] || 0; // NEW products on THIS week, until scrolled past

  return (
    // -mt-5 + safe-area top padding: the generic back bar no longer renders for /courses (its own
    // header carries the chevron now), so the page must clear the notch itself.
    <div className="-mt-5 flex flex-col gap-5 pt-[calc(env(safe-area-inset-top)+8px)] md:mt-0 md:pt-0">
      <div className="flex flex-col gap-1">
        {/* Back chevron, then the title below it (left-aligned, ~15% smaller). */}
        <div>
          <button
            type="button"
            onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/semaine"))}
            aria-label="Retour"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition active:scale-90 md:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-[1.6rem] font-extrabold tracking-tight">Ta liste de courses</h1>
        </div>
        {/* Which week you're viewing (moved out of the navigator) + the "new products" badge that lands
            here once you're on the week, and clears when you scroll down to actually look at the list. */}
        <div className="flex items-center gap-2 pl-1">
          <span className="text-base font-bold text-stone-500">{weekLabel}</span>
          {!done && currentWeekUnseen > 0 && (
            <span className="pop flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-extrabold text-white" aria-label={`${currentWeekUnseen} nouveau${currentWeekUnseen > 1 ? "x" : ""}`}>
              {currentWeekUnseen > 99 ? "99+" : currentWeekUnseen}
            </span>
          )}
        </div>
      </div>
      {/* Week navigator: ◀ · back-to-current-week · ▶ */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-stone-100 bg-white px-2 py-1.5">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label={backUnseen > 0 ? `Semaine précédente, ${backUnseen} nouveau${backUnseen > 1 ? "x" : ""}` : "Semaine précédente"}
          className="relative rounded-full p-2 text-stone-500 transition active:scale-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
          {/* New products waiting in an earlier week -> this arrow leads there. */}
          {backUnseen > 0 && (
            <span className="pop absolute right-0 top-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[0.65rem] font-extrabold leading-none text-white ring-2 ring-white">
              {backUnseen > 9 ? "9+" : backUnseen}
            </span>
          )}
        </button>
        {/* On the current week this is a plain label (no button chrome — you're already here);
            on any other week it's a tappable white btn-3d that brings you back. */}
        {weekOffset === 0 ? (
          // On the current week it's just a label ("you are here"), not a button — nothing to tap.
          <span className="px-4 py-1.5 text-sm font-extrabold text-[var(--primary)]">Cette semaine</span>
        ) : (
          // On any other week it's a real button that brings you back to the current week.
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            aria-label="Revenir à cette semaine"
            className="btn-3d btn-neutral rounded-full px-4 py-1.5 text-sm"
          >
            Cette semaine
          </button>
        )}
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label={fwdUnseen > 0 ? `Semaine suivante, ${fwdUnseen} nouveau${fwdUnseen > 1 ? "x" : ""}` : "Semaine suivante"}
          className="relative rounded-full p-2 text-stone-500 transition active:scale-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
          {/* New products waiting in a later week (e.g. meals planned ahead) -> this arrow leads there. */}
          {fwdUnseen > 0 && (
            <span className="pop absolute right-0 top-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[0.65rem] font-extrabold leading-none text-white ring-2 ring-white">
              {fwdUnseen > 9 ? "9+" : fwdUnseen}
            </span>
          )}
        </button>
      </div>

      {/* Estimer pour — the shops around the user, filtered by mode (walk-in vs Drive/Livraison). */}
      <section>
        <div className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-stone-500">Estimer pour</div>
        {nearbyLoading || switching ? (
          <p className="flex items-center gap-2 px-1 text-sm font-semibold text-stone-500">
            <Spinner className="h-4 w-4" /> On regarde les {mode === "magasin" ? "magasins" : "drives / livraisons"} autour de toi…
          </p>
        ) : options.length > 0 ? (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {options.map((m) => {
              const on = (store?.key ?? "") === m.key;
              const sub = [m.city, m.dist ? `${(m.dist / 1000).toFixed(1)} km` : null].filter(Boolean).join(" · ");
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => pickStore(m.key)}
                  aria-pressed={on}
                  className={`flex w-52 shrink-0 items-center gap-2.5 rounded-2xl border-2 py-2 pl-2 pr-3 text-left transition active:scale-95 ${
                    on ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--neutral-border)] bg-white"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                    {m.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/markets/${m.logo}`} alt="" className="h-7 w-7 object-contain" />
                    ) : (
                      <span className="text-sm font-black text-stone-400">{m.name.slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-stone-900">{m.name}</span>
                    {sub && <span className="block truncate text-[11px] font-semibold text-stone-500">{sub}</span>}
                    {m.address && <span className="block truncate text-[11px] text-stone-400">{m.address}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-1 text-sm font-semibold text-stone-500">
            Aucun {mode === "magasin" ? "magasin" : "drive / livraison"} trouvé autour de toi.
          </p>
        )}
      </section>

      {/* En magasin / Drive-Livraison */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl border-2 border-stone-100 bg-stone-50 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => changeMode(m.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition active:scale-[0.98] ${
              mode === m.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
            }`}
          >
            <Icon name={m.icon} size={18} /> {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 rounded-2xl" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : done ? (
        <section className="clay-card flex flex-col items-center gap-3 border-2 border-green-200 bg-green-50/60 p-8 text-center">
          <span className="pop text-5xl" aria-hidden>✅</span>
          <p className="text-lg font-extrabold text-stone-900">Courses faites&nbsp;!</p>
          <p className="text-sm text-stone-500">Ta liste est terminée.</p>
          <button type="button" onClick={() => setWeekDone(false)} className="btn-3d btn-neutral mt-1 rounded-full px-5 py-2.5 text-sm">Rouvrir la liste</button>
        </section>
      ) : itemCount === 0 ? (
        <section className="clay-card flex flex-col items-center gap-3 border-2 border-stone-100 p-8 text-center">
          <span className="text-5xl" aria-hidden>☹️</span>
          <p className="font-bold text-stone-800">Pas de repas cette semaine</p>
          <p className="text-sm text-stone-500">Choisis tes plats dans <b>Repas</b> ou <b>Calendrier</b>&nbsp;: ta liste se remplit toute seule.</p>
          <Link href="/" className="btn-3d btn-primary mt-1 rounded-full px-5 py-2.5 text-sm">Choisir des repas</Link>
        </section>
      ) : (
        // Premium-gated once the trial lapses: ONLY the shopping value is blurred (the products to
        // buy, the extras, the total). The header, week nav and store picker above stay sharp, and
        // PremiumOverlay locks scroll so the offer stays dead-centre. See the overlay at page end.
        <div className={locked ? "pointer-events-none select-none blur-[7px] saturate-[0.85]" : undefined} aria-hidden={locked || undefined}>
          {/* Sticky at the top of the list: how many are ticked + the running total. Stays visible
              while scrolling a long list, so you always know where you're at. */}
          {/* /courses has no slim back bar (its own header scrolls away), so --header-h over-reserves
              ~56px on mobile and the bar used to pin too low, leaving a void under the Dynamic Island.
              Pin it just below the safe-area on mobile (beige bg fills across, no gap); keep the
              below-the-header position on desktop where the orange header is always shown. */}
          <div className="sticky top-[calc(env(safe-area-inset-top)+8px)] z-10 -mx-4 flex items-center justify-between gap-3 rounded-b-3xl border-y-2 border-stone-100 bg-[var(--background)] px-4 py-2.5 md:top-[calc(var(--header-h)-25px)]">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-stone-800">
                {doneCount}
                <span className="text-stone-400">/{totalCount}</span> coché{totalCount > 1 ? "s" : ""}
              </div>
              <div className="mt-1.5 h-2 w-full max-w-[11rem] overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={totalCount}>
                <motion.div
                  className="h-full rounded-full bg-[var(--primary)]"
                  initial={false}
                  animate={{ width: `${totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%` }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Total estimé</div>
              <div className="text-3xl font-extrabold leading-none text-green-600">~ {euro(total)}</div>
            </div>
          </div>

          {maxTotal > minTotal + 0.01 && (
            <BudgetSlider level={budgetLevel} onLevel={changeBudget} />
          )}

          <button type="button" onClick={askComplete} className="btn-3d btn-primary w-full rounded-2xl py-3.5 text-base">
            <Icon name="check-circle" size={20} /> {mode === "magasin" ? "J'ai terminé mes courses" : "Commande effectuée"}
          </button>

          <section className="clay-card flex flex-col gap-4 border-2 border-stone-100 p-4">
            {/* One boxed section per planned meal: course chip + title, product count, who it's for
                (tap to reveal names inline), then its products. State changes animate; the list does
                not choreograph its own load (it's opened often — Emil's frequency rule + product register). */}
            <div className="flex flex-col gap-4">
              {dishGroups.map((g) => {
                const canDel = !g.addedBy || g.addedBy === me.id;
                const dinerNames = g.diners.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean);
                // Ticked products sink to the bottom of their meal (stable within each half).
                const sorted = [...g.products].sort(
                  (a, b) => (checked.has(`${g.key}|${a.foodId}`) ? 1 : 0) - (checked.has(`${g.key}|${b.foodId}`) ? 1 : 0),
                );
                return (
                  <motion.div key={g.key} layout transition={{ duration: reduce ? 0 : 0.28, ease: EASE }} className="rounded-2xl border-2 border-stone-100 p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-2xl font-extrabold text-stone-900">
                          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--primary-soft)] text-lg leading-none">
                            {dishImage(g.dishId) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={dishImage(g.dishId)!} alt="" className="h-full w-full object-cover" />
                            ) : (
                              COURSE_EMOJI[g.course] ?? "🍽️"
                            )}
                          </span>
                          <span className="truncate">{g.dishName}</span>
                        </div>
                        <span className="mt-1 inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-500">
                          {g.ingredientCount} ingrédient{g.ingredientCount > 1 ? "s" : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPeopleBubble((k) => (k === g.key ? null : g.key))}
                        aria-label={`Pour ${g.people} personne${g.people > 1 ? "s" : ""}${dinerNames.length ? " : " + dinerNames.join(", ") : ""}`}
                        aria-expanded={peopleBubble === g.key}
                        className="flex shrink-0 cursor-pointer flex-col items-end gap-1 rounded-lg p-0.5 outline-none transition active:opacity-70 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        <span className="flex items-center gap-1 text-stone-500">
                          <Icon name="user" size={18} strokeWidth={2.4} />
                          <span className="text-base font-extrabold leading-none">×{g.people}</span>
                        </span>
                      </button>
                    </div>
                    {/* Names revealed inline (a floating bubble covered the first product's price). */}
                    <AnimatePresence initial={false}>
                      {peopleBubble === g.key && dinerNames.length > 0 && (
                        <motion.div
                          className="overflow-hidden"
                          initial={reduce ? false : { height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: EASE }}
                        >
                          <div className="mb-2 rounded-xl bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--primary-dark)]">
                            Pour&nbsp;: {dinerNames.join(", ")}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex flex-col">
                      <AnimatePresence initial={false}>
                        {sorted.map((p, idx) => {
                          const k = `${g.key}|${p.foodId}`;
                          const on = checked.has(k);
                          const brand = overrides[k]?.brand ?? p.brand;
                          const productRow = (
                            <ProductRow
                              product={p}
                              checked={on}
                              canDelete={canDel}
                              brand={brand}
                              isLast={idx === sorted.length - 1}
                              onToggle={() => toggleCheck(k)}
                              onRemove={() => removeItem(k)}
                              onSwapBrand={() => {
                                const i = p.brands.indexOf(brand ?? "");
                                setOverride(k, { brand: p.brands[(i + 1) % p.brands.length] });
                              }}
                              onQtyDelta={(d) => setOverride(k, { qty: Math.max(1, Math.min(99, p.packs + d)) })}
                            />
                          );
                          return (
                            <motion.div
                              key={k}
                              layout
                              initial={false}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
                              className="overflow-hidden"
                            >
                              {canDel && !on ? <SwipeToDelete onDelete={() => removeItem(k)}>{productRow}</SwipeToDelete> : productRow}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Products any family member asks to add — shown only once someone has asked; otherwise
                just the add box. Each line: check it off when picked, who asked, brand + quantity. */}
            <div className="border-t-2 border-dashed border-stone-200 pt-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-stone-500">
                <Icon name="user-plus" size={18} />
                {requests.length > 0 ? "Les produits demandés en plus" : "Ajouter quelque chose à la liste"}
              </div>

              {requests.length > 0 && (
                <div className="mb-3 flex flex-col gap-3">
                  {[...new Set(requests.map((r) => r.memberId))].map((mid) => {
                    const asker = members.find((m) => m.id === mid);
                    const items = requests.filter((r) => r.memberId === mid);
                    const folded = collapsedReq.has(mid);
                    return (
                      <div key={mid} className="overflow-hidden rounded-2xl border-2 border-stone-100">
                        {/* One collapsible group per requester (their photo + name), open by default. */}
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedReq((s) => {
                              const n = new Set(s);
                              n.has(mid) ? n.delete(mid) : n.add(mid);
                              return n;
                            })
                          }
                          className="flex w-full items-center gap-2.5 bg-stone-50 px-3 py-2 text-left active:opacity-80"
                        >
                          {asker ? <Avatar person={asker} size={26} /> : <span className="h-[26px] w-[26px] shrink-0 rounded-full bg-stone-200" />}
                          <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-stone-800">{asker?.name ?? "Quelqu'un"}</span>
                          <span className="shrink-0 text-xs font-bold text-stone-400">{items.length}</span>
                          <span className="shrink-0 text-stone-400" aria-hidden>{folded ? "▸" : "▾"}</span>
                        </button>
                        {!folded && (
                          <div className="flex flex-col px-3">
                            {items.map((r) => {
                              const ron = r.checked;
                              const canDelete = me.id === r.memberId;
                              const row = (
                                <div className="flex items-center gap-2 border-t border-stone-100 py-2 pl-0.5 pr-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleCheckReq(r.id)}
                                    aria-pressed={ron}
                                    aria-label={ron ? `Décocher ${r.label}` : `Cocher ${r.label}`}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
                                  >
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${ron ? "border-[var(--primary)] bg-[var(--primary)]" : "border-stone-300 bg-white"}`}>
                                      {ron && (
                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="20 6 9 17 4 12" /></svg>
                                      )}
                                    </span>
                                    <span className="min-w-0">
                                      <span className={`block truncate text-base font-semibold ${ron ? "text-stone-400 line-through" : "text-stone-800"}`}>{r.label}</span>
                                      <span className={`block truncate text-xs font-semibold ${ron ? "text-stone-300 line-through" : "text-stone-400"}`}>
                                        {r.brand ? <span className={ron ? "" : "text-stone-500"}>{r.brand}</span> : null}
                                        {r.brand ? " · " : ""}×{r.qty}
                                      </span>
                                    </span>
                                  </button>
                                  {/* Ticked = struck through, trash hidden. */}
                                  {canDelete && !ron && (
                                    <button type="button" onClick={() => removeRequest(r.id)} aria-label={`Retirer ${r.label}`} className="shrink-0 rounded-full p-1.5 text-red-500 transition active:scale-90 active:bg-red-50">
                                      <Icon name="trash" size={18} />
                                    </button>
                                  )}
                                </div>
                              );
                              return canDelete && !ron ? (
                                <SwipeToDelete key={r.id} onDelete={() => removeRequest(r.id)}>{row}</SwipeToDelete>
                              ) : (
                                <div key={r.id}>{row}</div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={addRequest} className="flex flex-col gap-2">
                <input
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  placeholder="Papier toilette…"
                  maxLength={80}
                  className="w-full rounded-full border-2 border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 outline-none transition-colors focus:border-[var(--primary)]"
                />
                <div className="flex items-center gap-2">
                  <input
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Marque (optionnel)"
                    maxLength={60}
                    className="min-w-0 flex-1 rounded-full border-2 border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 outline-none transition-colors focus:border-[var(--primary)]"
                  />
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-stone-200 bg-white px-1 py-1">
                    <button
                      type="button"
                      onClick={() => setNewQty((q) => Math.max(1, q - 1))}
                      disabled={newQty <= 1}
                      aria-label="Moins"
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-lg font-extrabold leading-none transition active:scale-90 ${newQty > 1 ? "bg-stone-600 text-stone-100" : "bg-stone-100 text-stone-400"}`}
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-extrabold text-stone-800">{newQty}</span>
                    <button
                      type="button"
                      onClick={() => setNewQty((q) => Math.min(99, q + 1))}
                      aria-label="Plus"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-extrabold leading-none text-white transition active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={!newProduct.trim() || addingReq} className="btn-3d btn-primary w-full rounded-full py-2 text-sm disabled:opacity-50">
                  Ajouter
                </button>
              </form>
            </div>
          </section>

          {mode === "drivelivraison" && store && (
            <button type="button" onClick={() => setPending(store)} className="btn-3d btn-primary w-full rounded-2xl py-3.5 text-base">
              <Icon name="shopping-cart" size={20} /> Commander chez {store.name}
            </button>
          )}
        </div>
      )}

      {/* The offer, fixed dead-centre over the blurred list — stays put as the list grows on load,
          and locks scroll. Only shown when there's actually a list to gate. */}
      {locked && !loading && !done && itemCount > 0 && <PremiumOverlay feature="La liste de courses" />}
      {pending && <PartnerModal market={pending} onLinked={() => setPending(null)} onClose={() => setPending(null)} />}

      {confirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirm(null)}>
          <div className="modal-in w-full max-w-sm rounded-3xl bg-white p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center text-[var(--primary)]" aria-hidden><Icon name="shopping-cart" size={40} /></div>
            <h2 className="mt-2 text-lg font-extrabold text-stone-900">{confirm.title}</h2>
            <p className="mt-1 text-sm text-stone-600">
              {confirm.message} <b className="font-extrabold text-stone-800">La liste sera vidée.</b>
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="btn-3d btn-neutral flex-1 rounded-full py-2.5 text-sm">Pas encore</button>
              <button type="button" onClick={confirm.onConfirm} className="btn-3d btn-primary flex-1 rounded-full py-2.5 text-sm">Oui, c&apos;est fait</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
