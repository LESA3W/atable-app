"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Spinner } from "@/components/Spinner";
import { MarketCard } from "@/components/MarketCard";
import { Icon } from "@/components/Icon";
import {
  fetchCitiesByPostcode,
  fetchDriveMarkets,
  marketsOf,
  reverseGeocode,
  type CitySuggestion,
  type Market,
  type ShoppingValue,
} from "@/lib/shopping";

// Light-card version of the onboarding shopping step, for Settings: change the
// location and the chosen Drive/market at any time. Every change is saved via
// PATCH /api/me (member.onboarding.shopping) and onSaved() refreshes the profile.
export function ShoppingEditor({
  initial,
  onSaved,
}: {
  initial: ShoppingValue;
  onSaved: () => void | Promise<void>;
}) {
  const [value, setValue] = useState<ShoppingValue>(initial ?? {});
  const [status, setStatus] = useState<
    "idle" | "locating" | "loading" | "done" | "error" | "markets_error"
  >(initial?.lat != null ? "loading" : "idle");
  const [cp, setCp] = useState(initial?.postalCode ?? "");
  const [cities, setCities] = useState<CitySuggestion[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  // The nearby-stores list is folded by default in Settings; the chosen one stays pinned.
  const [showList, setShowList] = useState(false);

  const hasLocation = !!value.city || value.lat != null;

  async function persist(next: ShoppingValue) {
    setValue(next);
    try {
      await apiFetch("/api/me", { method: "PATCH", body: JSON.stringify({ shopping: next }) });
      await onSaved();
    } catch {
      // best effort; the local state still reflects the choice
    }
  }

  // On open, if a location is already saved, load its nearby stores straight away so the
  // user sees them (and their pick highlighted) without having to re-locate.
  useEffect(() => {
    if (initial?.lat != null && initial?.lon != null) void loadMarkets(initial.lat, initial.lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-retries several times (Overpass is flaky) before surfacing an error.
  async function loadMarkets(lat: number, lon: number, attempt = 0) {
    if (attempt === 0) {
      setStatus("loading");
      setMarkets([]);
      setShowList(false);
    }
    try {
      setMarkets(await fetchDriveMarkets(lat, lon));
      setStatus("done");
    } catch {
      if (attempt < 3) {
        await new Promise((res) => setTimeout(res, 1200));
        return loadMarkets(lat, lon, attempt + 1);
      }
      setStatus("markets_error");
    }
  }

  function useLocation() {
    if (!navigator.geolocation) return setStatus("error");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let next: ShoppingValue = { ...value, lat, lon, markets: [] };
        try {
          const { postcode, city } = await reverseGeocode(lat, lon);
          setCp(postcode ?? "");
          next = { ...next, postalCode: postcode, city };
        } catch {
          // keep coords; markets still load
        }
        setCities([]);
        await persist(next);
        await loadMarkets(lat, lon);
      },
      () => setStatus("error"),
      { timeout: 10000, enableHighAccuracy: false },
    );
  }

  async function onCpChange(v: string) {
    const digits = v.replace(/[^0-9]/g, "").slice(0, 5);
    setCp(digits);
    if (digits.length !== 5) return setCities([]);
    try {
      setCities(await fetchCitiesByPostcode(digits));
    } catch {
      setCities([]);
    }
  }

  async function pickCity(c: CitySuggestion) {
    setCities([]);
    await persist({ ...value, postalCode: c.postcode, city: c.name, markets: [], lat: c.lat, lon: c.lon });
    await loadMarkets(c.lat, c.lon);
  }

  // Add/remove a store from the multi-select and persist.
  function toggleMarket(key: string) {
    const set = new Set(marketsOf(value));
    if (set.has(key)) set.delete(key);
    else set.add(key);
    void persist({ ...value, markets: [...set] });
  }

  function retryMarkets() {
    if (value.lat != null && value.lon != null) void loadMarkets(value.lat, value.lon);
  }

  async function change() {
    setStatus("idle");
    setMarkets([]);
    setCities([]);
    setCp("");
    await persist({});
  }

  const chosen = marketsOf(value);
  const selectedMarkets = markets.filter((m) => chosen.includes(m.key));

  return (
    <div className="flex flex-col gap-2.5">
      {!hasLocation ? (
        <>
          <button
            type="button"
            onClick={useLocation}
            disabled={status === "locating"}
            className="btn-3d btn-primary rounded-full py-2.5 text-sm disabled:opacity-60"
          >
            {status === "locating" ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Localisation…
              </span>
            ) : (
              "Utiliser ma position"
            )}
          </button>

          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-stone-400">
            <span className="h-px flex-1 bg-stone-200" /> ou <span className="h-px flex-1 bg-stone-200" />
          </div>

          <div>
            <input
              value={cp}
              onChange={(e) => onCpChange(e.target.value)}
              inputMode="numeric"
              placeholder="Ton code postal"
              className="w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-900 outline-none focus:border-orange-300"
            />
            {cities.length > 0 && (
              <div className="step-in mt-1 overflow-hidden rounded-xl border-2 border-stone-200 bg-white">
                {cities.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => pickCity(c)}
                    className="flex w-full items-center gap-2 border-b border-stone-100 px-3 py-2.5 text-left text-sm font-bold text-stone-800 transition last:border-0 active:bg-orange-50"
                  >
                    <span className="text-stone-400">{c.postcode}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {status === "error" && (
            <p className="text-sm font-semibold text-stone-500">
              Localisation indisponible. Entre ton code postal ci-dessus.
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-orange-50 px-3 py-2.5">
          <span className="truncate font-bold text-stone-900">
            {value.city ? `${value.postalCode ?? ""} ${value.city}` : "Autour de ma position"}
          </span>
          <button type="button" onClick={change} className="shrink-0 text-sm font-bold text-orange-700 underline">
            Changer
          </button>
        </div>
      )}

      {status === "loading" && (
        <p className="flex items-center gap-2 text-sm font-semibold text-stone-500">
          <Spinner /> Recherche des magasins autour…
        </p>
      )}

      {status === "markets_error" && (
        <div className="step-in flex flex-col gap-2 rounded-xl bg-stone-50 px-3 py-2.5">
          <p className="text-sm font-semibold text-stone-600">
            Magasins indisponibles pour l&apos;instant (service momentanément saturé).
          </p>
          <button type="button" onClick={retryMarkets} className="btn-3d btn-primary self-start rounded-full px-4 py-2 text-sm">
            Réessayer
          </button>
        </div>
      )}

      {status === "done" &&
        (markets.length > 0 ? (
          <div className="step-in flex flex-col gap-2.5">
            {/* The chosen stores stay visible even when the list is folded. Tap to remove. */}
            {selectedMarkets.map((m) => (
              <MarketCard key={m.key} market={m} selected onClick={() => toggleMarket(m.key)} />
            ))}

            {/* Fold/unfold the full list of nearby Drive + delivery stores (multi-select). */}
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              className="flex items-center justify-between rounded-2xl border-2 border-stone-100 px-3.5 py-3 text-left font-bold text-stone-800 transition active:scale-[0.99]"
            >
              <span className="flex items-center gap-2">
                <Icon name="shopping-cart" size={18} />
                {selectedMarkets.length ? "Ajouter / changer de magasin" : "Choisir mes magasins"}
                <span className="font-semibold text-stone-400">({markets.length})</span>
              </span>
              <span className="text-stone-400">{showList ? "▲" : "▸"}</span>
            </button>

            {showList && (
              <div className="step-in flex flex-col gap-2.5">
                <p className="text-sm font-semibold text-stone-500">
                  Sélectionne le(s) magasin(s) où tu fais tes courses — tu peux en cocher plusieurs.
                </p>
                {markets
                  .filter((m) => !chosen.includes(m.key))
                  .map((m) => (
                    <MarketCard
                      key={m.key}
                      market={m}
                      selected={false}
                      onClick={() => toggleMarket(m.key)}
                    />
                  ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold text-stone-500">
            Aucun Drive ni livraison trouvé dans un rayon de 10&nbsp;km.
          </p>
        ))}
    </div>
  );
}
