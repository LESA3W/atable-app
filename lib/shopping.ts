// Shared "where do you shop" logic: postal-code -> cities, reverse geocode, and the
// nearby Drive / home-delivery supermarkets. All free APIs (geo.api.gouv, data.gouv
// BAN, OpenStreetMap Overpass). Used by the onboarding step and the settings editor.

export type ShoppingValue = {
  postalCode?: string;
  city?: string;
  markets?: string[]; // the stores the user shops at (Market.key[]) — multi-select
  market?: string; // legacy single store, still read from old profiles
  lat?: number;
  lon?: number;
};

// The chosen stores as an array, tolerant of the legacy single-`market` shape so old
// profiles keep working. Use this everywhere the saved stores are read.
export function marketsOf(v: { markets?: string[] | null; market?: string | null } | null | undefined): string[] {
  if (!v) return [];
  if (v.markets && v.markets.length) return v.markets;
  return v.market ? [v.market] : [];
}

export type Service = "Drive" | "Livraison";
export type Market = {
  key: string; // stable id for selection/storage (name + city)
  name: string;
  city?: string;
  address?: string; // street + number only (no postcode/city)
  lat?: number; // store coords (parsed from the key) — used to backfill a missing address
  lon?: number;
  dist: number; // metres from the user
  services: Service[]; // Drive / Livraison offered
  physical: boolean; // has a walk-in store
  logo?: string; // filename in /markets/, if we ship one for the chain
};
export type CitySuggestion = { name: string; postcode: string; lat: number; lon: number };

// French chains that offer Drive and/or home delivery. OSM rarely tags this per store,
// so we key off the brand. `label` is the clean display name, `logo` the file we ship
// (in /public/markets), `services` what the chain offers nationally. Order matters:
// more specific keys first (e.g. "hyper u" before a bare "u").
// `physical` = has a walk-in store you can shop in (all true except pure Drive points like
// Chronodrive). `services` = the Drive/Livraison it offers nationally.
type Chain = { keys: string[]; label: string; logo?: string; services: Service[]; physical: boolean };
const CHAINS: Chain[] = [
  { keys: ["e.leclerc", "leclerc"], label: "E.Leclerc", logo: "leclerc.png", services: ["Drive", "Livraison"], physical: true },
  { keys: ["carrefour"], label: "Carrefour", logo: "carrefour.png", services: ["Drive", "Livraison"], physical: true },
  { keys: ["auchan"], label: "Auchan", logo: "auchan.png", services: ["Drive", "Livraison"], physical: true },
  { keys: ["intermarche"], label: "Intermarché", logo: "intermarche.png", services: ["Drive", "Livraison"], physical: true },
  { keys: ["netto"], label: "Netto", logo: "netto.png", services: ["Drive"], physical: true },
  {
    keys: ["hyper u", "super u", "u express", "magasins u", "courses u", "systeme u", "hyperu", "superu", "utile"],
    label: "Super U",
    logo: "u.png",
    services: ["Drive", "Livraison"],
    physical: true,
  },
  { keys: ["grand frais"], label: "Grand Frais", logo: "grandfrais.png", services: ["Livraison"], physical: true },
  { keys: ["chronodrive"], label: "Chronodrive", logo: "chronodrive.png", services: ["Drive"], physical: false },
  { keys: ["cora"], label: "Cora", logo: "cora.png", services: ["Drive", "Livraison"], physical: true },
  { keys: ["geant", "casino"], label: "Casino", logo: "casino.png", services: ["Drive", "Livraison"], physical: true },
  { keys: ["monoprix"], label: "Monoprix", logo: "monoprix.png", services: ["Livraison"], physical: true },
  { keys: ["franprix"], label: "Franprix", logo: "franprix.png", services: ["Livraison"], physical: true },
  { keys: ["naturalia"], label: "Naturalia", logo: "naturalia.png", services: ["Livraison"], physical: true },
  { keys: ["lidl"], label: "Lidl", logo: "lidl.png", services: [], physical: true },
  { keys: ["aldi"], label: "Aldi", logo: "aldi.png", services: [], physical: true },
  { keys: ["biocoop"], label: "Biocoop", logo: "biocoop.png", services: ["Drive", "Livraison"], physical: true },
  { keys: ["la vie claire", "vie claire"], label: "La Vie Claire", logo: "lavieclaire.png", services: ["Livraison"], physical: true },
  { keys: ["satoriz"], label: "Satoriz", logo: "satoriz.png", services: [], physical: true },
  { keys: ["picard"], label: "Picard", logo: "picard.png", services: ["Drive", "Livraison"], physical: true },
  { keys: ["promocash"], label: "Promocash", logo: "promocash.png", services: ["Drive"], physical: true },
  { keys: ["vival"], label: "Vival", logo: "vival.png", services: [], physical: true },
  { keys: ["supermarche match", "match"], label: "Match", logo: "match.png", services: ["Drive", "Livraison"], physical: true },
  { keys: ["spar"], label: "Spar", logo: "spar.png", services: [], physical: true },
  { keys: ["proxi"], label: "Proxi", logo: "proxi.png", services: [], physical: true },
];

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
}

function findChain(tags: Record<string, string>): Chain | null {
  const hay = norm(`${tags.name ?? ""} ${tags.brand ?? ""}`);
  return CHAINS.find((c) => c.keys.some((k) => hay.includes(k))) ?? null;
}

// A stored Market.key is `${name}@${lat},${lon}` where name is the chain label. Rebuild a
// minimal Market from a saved key (for the shopping-list "order online" flow), including the
// chain logo when we ship one, so PartnerModal + MarketCard render it properly.
export function marketFromKey(key: string): Market {
  const name = key.split("@")[0];
  const [rawLat, rawLon] = (key.split("@")[1] ?? "").split(",").map(Number);
  const lat = Number.isFinite(rawLat) ? rawLat : undefined;
  const lon = Number.isFinite(rawLon) ? rawLon : undefined;
  const chain = CHAINS.find((c) => c.label === name);
  return { key, name, lat, lon, dist: 0, services: chain?.services ?? [], physical: chain?.physical ?? true, logo: chain?.logo };
}

// Backfill a street address (and city) on any market that lacks one, by reverse-geocoding its
// coords. Saved markets (marketFromKey) carry only name + coords, so every card can still show an
// address wherever it renders. Best-effort + parallel; a failure just leaves that card as-is.
export async function hydrateAddresses(markets: Market[]): Promise<Market[]> {
  return Promise.all(
    markets.map(async (m) => {
      if (m.address || m.lat == null || m.lon == null) return m;
      try {
        const { city, street } = await storeAddress(m.lat, m.lon);
        return { ...m, city: m.city ?? city, address: street ?? m.address };
      } catch {
        return m;
      }
    }),
  );
}

// Real partner pages per chain: sign-in, sign-up and terms (CGU/CGV/mentions légales).
// Each URL was found and checked via web search against the chain's own site (July 2026).
// A few chains have no web account at all (Netto is app-only, Grand Frais is a store
// locator with only local, per-store delivery): those point at the real entry point that
// exists, and their `terms` uses a targeted search that lands on the right legal page.
const gsearch = (s: string) => `https://www.google.com/search?q=${encodeURIComponent(s)}`;

export type PartnerLinks = { home: string; signin: string; signup: string; terms: string };
const PARTNER_LINKS: Record<string, PartnerLinks> = {
  "E.Leclerc": {
    home: "https://www.e.leclerc/",
    signin: "https://www.e.leclerc/auth",
    signup: "https://www.e.leclerc/auth",
    terms: "https://www.e.leclerc/e/conditions-generales-de-vente",
  },
  Carrefour: {
    home: "https://www.carrefour.fr/",
    signin: "https://www.carrefour.fr/mon-compte/inscription-login",
    signup: "https://www.carrefour.fr/mon-compte/inscription",
    terms: "https://www.carrefour.fr/conditions-generales-ventes",
  },
  Auchan: {
    home: "https://www.auchan.fr/",
    signin: "https://mon-compte.auchan.fr/",
    signup: "https://mon-compte.auchan.fr/creation-compte-auchan",
    terms: "https://www.auchan.fr/cgv/ep-cgv",
  },
  Intermarché: {
    home: "https://www.intermarche.com/",
    signin: "https://www.intermarche.com/mon-compte",
    signup: "https://www.intermarche.com/mon-compte/creer-mon-compte",
    terms: "https://www.intermarche.com/informations-legales/conditions-generales-utilisation",
  },
  Netto: {
    // No web account (fidelity lives in the Netto France app), so account links open the
    // official site; terms via a targeted search (Netto ships no stable legal URL).
    home: "https://www.netto.fr/",
    signin: "https://www.netto.fr/",
    signup: "https://www.netto.fr/",
    terms: gsearch("Netto mentions légales conditions générales netto.fr"),
  },
  "Super U": {
    home: "https://www.coursesu.com/",
    signin: "https://www.magasins-u.com/mon-espace-u",
    signup: "https://www.magasins-u.com/formulaire-inscription",
    terms: "https://reservation.coursesu.com/cgv.html",
  },
  "Grand Frais": {
    // Store locator only (national drive is the sister brand "fresh."); no online account.
    home: "https://www.grandfrais.com/",
    signin: "https://www.grandfrais.com/",
    signup: "https://www.grandfrais.com/",
    terms: gsearch("Grand Frais mentions légales conditions générales grandfrais.com"),
  },
  Chronodrive: {
    home: "https://www.chronodrive.com/",
    signin: "https://www.chronodrive.com/login",
    signup: "https://www.chronodrive.com/login",
    terms: "https://www.chronodrive.com/cgv",
  },
  Cora: {
    home: "https://www.cora.fr/",
    signin: "https://www.cora.fr/connexion",
    signup: "https://www.cora.fr/connexion",
    terms: "https://www.cora.fr/legal/informations-juridiques/cgu-compte-client-internet",
  },
  Casino: {
    home: "https://www.casino.fr/",
    signin: "https://www.casino.fr/ecommerce",
    signup: "https://sso.casino.fr/cc/webMCC/signup-singlepage",
    terms: "https://casino.fr/page/conditions-generales-dutilisation",
  },
  Monoprix: {
    home: "https://www.monoprix.fr/",
    signin: "https://www.monoprix.fr/mon-profil",
    signup: "https://www.monoprix.fr/mon-profil",
    terms: "https://www.monoprix.fr/conditions-generales-de-vente.html",
  },
  Franprix: {
    home: "https://www.franprix.fr/",
    signin: "https://www.franprix.fr/compte/connexion",
    signup: "https://www.franprix.fr/compte/connexion",
    terms: "https://www.franprix.fr/site/conditions-generales-de-vente",
  },
  Naturalia: {
    home: "https://www.naturalia.fr/",
    signin: "https://www.naturalia.fr/",
    signup: "https://www.naturalia.fr/",
    terms: "https://www.naturalia.fr/conditions-generales",
  },
  // Discount stores: no online grocery account in France, so links point at the site.
  Lidl: {
    home: "https://www.lidl.fr/",
    signin: "https://www.lidl.fr/",
    signup: "https://www.lidl.fr/",
    terms: gsearch("Lidl France mentions légales conditions générales"),
  },
  Aldi: {
    home: "https://www.aldi.fr/",
    signin: "https://www.aldi.fr/",
    signup: "https://www.aldi.fr/",
    terms: gsearch("Aldi France mentions légales conditions générales"),
  },
};

export function partnerLinks(name: string): PartnerLinks {
  return (
    PARTNER_LINKS[name] ?? {
      home: gsearch(name),
      signin: gsearch(`${name} connexion compte`),
      signup: gsearch(`${name} créer un compte`),
      terms: gsearch(`${name} conditions générales d'utilisation`),
    }
  );
}

export function haversine(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371000;
  const dLa = ((la2 - la1) * Math.PI) / 180;
  const dLo = ((lo2 - lo1) * Math.PI) / 180;
  const a =
    Math.sin(dLa / 2) ** 2 +
    Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Several Overpass mirrors: the main instance regularly 504s under load, so we fall
// through to the others before giving up.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

type OverpassEl = {
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

type RawMarket = Market & { la: number; lo: number };

function toMarkets(els: OverpassEl[], lat: number, lon: number): RawMarket[] {
  const raw: RawMarket[] = [];
  for (const e of els) {
    const tags = e.tags ?? {};
    const la = e.lat ?? e.center?.lat ?? lat;
    const lo = e.lon ?? e.center?.lon ?? lon;
    const dist = haversine(lat, lon, la, lo);
    if (dist > 10000) continue;

    const chain = findChain(tags);
    let name: string;
    let services: Service[];
    let logo: string | undefined;
    let physical: boolean;
    if (chain) {
      name = chain.label;
      services = chain.services;
      logo = chain.logo;
      physical = chain.physical;
    } else {
      // Unknown brand: a shop=supermarket is a walk-in store, so keep it (with whatever
      // Drive/Livraison OSM knows about) as long as it has a real name.
      name = tags.name || tags.brand || "";
      if (!name) continue;
      const osmDrive = Object.entries(tags).some(([k, v]) => k.includes("drive") && v !== "no");
      const osmDeliv = tags.delivery === "yes";
      services = [osmDrive ? "Drive" : null, osmDeliv ? "Livraison" : null].filter(Boolean) as Service[];
      physical = true;
    }
    // Key is coordinate-based so two same-chain stores in the same town stay distinct
    // (unique React key + stable selection id). The city is display-only.
    const key = `${name}@${la.toFixed(4)},${lo.toFixed(4)}`;
    const address = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || undefined;
    raw.push({ key, name, city: tags["addr:city"], address, dist, services, physical, logo, la, lo });
  }

  // Nearest first, then merge duplicates. OSM maps one store several ways (a node inside its
  // building polygon, a separate "Drive" node, sometimes a stale point with a slightly different
  // name), which is why a single shop showed up two or three times. Two conservative rules so
  // genuinely-different neighbours still survive:
  //  - any two pins within 90 m are the SAME physical store (node+way / drive+store) whatever the
  //    name — the case the old exact-name rule missed. Keep the richer entry (a recognised chain,
  //    then one that carries an address).
  //  - same brand within 1.2 km is the same store listed twice a bit apart (was 700 m, too tight).
  raw.sort((a, b) => a.dist - b.dist);
  const rank = (m: RawMarket) => (m.logo ? 2 : 0) + (m.address ? 1 : 0);
  const kept: RawMarket[] = [];
  for (const m of raw) {
    const i = kept.findIndex(
      (k) =>
        haversine(k.la, k.lo, m.la, m.lo) < 90 ||
        (k.name === m.name && haversine(k.la, k.lo, m.la, m.lo) < 1200),
    );
    if (i >= 0) {
      if (rank(m) > rank(kept[i])) kept[i] = m; // same store mapped twice — keep the better-tagged one
      continue;
    }
    kept.push(m);
  }
  return kept.slice(0, 10);
}

// fetch with a hard timeout so a hung endpoint can never freeze the UI (the root cause
// of the "spinner loops forever" bug — reverse geocode and Overpass had no timeout).
async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 9000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Nearby supermarkets doing Drive or home delivery, within 10 km. Races ALL mirrors at
// once (Promise.any) so the first healthy one wins fast — no waiting through sequential
// timeouts. THROWS only if every mirror fails, so the caller can retry instead of
// falsely claiming there is nothing around. Returns [] only on a genuine empty result.
export async function fetchDriveMarkets(lat: number, lon: number): Promise<Market[]> {
  const q = `[out:json][timeout:12];(node(around:10000,${lat},${lon})[shop=supermarket];way(around:10000,${lat},${lon})[shop=supermarket];);out center 80;`;
  const attempt = async (url: string): Promise<RawMarket[]> => {
    const r = await fetchWithTimeout(url, { method: "POST", body: q }, 11000);
    if (!r.ok) throw new Error(`overpass_${r.status}`);
    const j = (await r.json()) as { elements?: OverpassEl[] };
    return toMarkets(j.elements ?? [], lat, lon);
  };
  const raw = await Promise.any(OVERPASS_MIRRORS.map(attempt));

  // OSM rarely tags addr:city / addr:street on stores, so fill the missing ones by reverse
  // geocoding each store's own coordinates (free, in parallel) — so every card always shows an
  // address. Best effort: a failure just leaves that field empty.
  await Promise.all(
    raw.map(async (m) => {
      if (m.city && m.address) return;
      try {
        const { city, street } = await storeAddress(m.la, m.lo);
        if (city && !m.city) m.city = city;
        if (street && !m.address) m.address = street;
      } catch {
        // leave the field empty
      }
    }),
  );

  return raw.map((m) => ({
    key: m.key,
    name: m.name,
    city: m.city,
    address: m.address,
    lat: m.la,
    lon: m.lo,
    dist: m.dist,
    services: m.services,
    physical: m.physical,
    logo: m.logo,
  }));
}

// Communes matching a full 5-digit postal code, with their centre coordinates.
export async function fetchCitiesByPostcode(cp: string): Promise<CitySuggestion[]> {
  const r = await fetchWithTimeout(
    `https://geo.api.gouv.fr/communes?codePostal=${cp}&fields=nom,centre&format=json`,
    {},
    8000,
  );
  const j = (await r.json()) as { nom: string; centre?: { coordinates: [number, number] } }[];
  return j
    .filter((c) => c.centre)
    .map((c) => ({ name: c.nom, postcode: cp, lon: c.centre!.coordinates[0], lat: c.centre!.coordinates[1] }));
}

// Postal code, city and street (housenumber + street name, no postcode/city) for a GPS point.
// This is BAN (data.gouv), address-point based: perfect for the USER's own location (postcode +
// city), but for a store's pin it returns the nearest civic address — often a neighbour, not the
// store. So it is NOT used to guess a store's street anymore (see storeAddress below).
export async function reverseGeocode(lat: number, lon: number): Promise<{ postcode?: string; city?: string; street?: string }> {
  const r = await fetchWithTimeout(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`, {}, 8000);
  const j = await r.json();
  const p = j.features?.[0]?.properties ?? {};
  // `name` on the BAN "housenumber" result is "12 Rue de la Paix"; fall back to the street.
  const street = p.name || [p.housenumber, p.street].filter(Boolean).join(" ") || undefined;
  return { postcode: p.postcode, city: p.city, street };
}

// POI-aware reverse geocode (OpenStreetMap Nominatim, same source as the stores). At a store's
// coordinates it returns that establishment's own street (road level), not the nearest random house
// number — far less likely to be confidently wrong than BAN. Free; a User-Agent is sent as the
// browser Referer. City falls back through the OSM place hierarchy.
export async function reverseGeocodePoi(lat: number, lon: number): Promise<{ city?: string; street?: string }> {
  const r = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lon}`,
    { headers: { "Accept-Language": "fr" } },
    8000,
  );
  if (!r.ok) throw new Error(`nominatim_${r.status}`);
  const j = await r.json();
  const a = (j.address ?? {}) as Record<string, string>;
  const city = a.city || a.town || a.village || a.municipality || undefined;
  // Road name only — the store IS on this street even when OSM lacks its exact number; adding a
  // guessed number is what made addresses look wrong.
  return { city, street: a.road || undefined };
}

// Best street + city for a store that OSM didn't tag with an address. Prefer the POI-aware OSM
// street; if that fails, keep only the (reliable) city from BAN — never BAN's guessed street.
async function storeAddress(lat: number, lon: number): Promise<{ city?: string; street?: string }> {
  try {
    const { city, street } = await reverseGeocodePoi(lat, lon);
    if (city || street) return { city, street };
  } catch {
    /* fall through */
  }
  try {
    const { city } = await reverseGeocode(lat, lon); // city is trustworthy; ignore BAN's street
    return { city };
  } catch {
    return {};
  }
}
