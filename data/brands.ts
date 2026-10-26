// Brand + packaging model for the shopping list. Turns "≈ 900 g of chicken" into a concrete
// line: a brand, a recognizable pack format, and how many packs to buy (x N). It stays an
// ESTIMATE — the exact product and price show on the retailer's own site when ordering.
//
// Brand rule (hybrid, chosen with the user):
//  - default  -> the selected store's own MDD (always in stock there + the cheapest).
//  - "icons"  -> a well-known national brand where it's what people actually buy (Nutella...),
//                EXCEPT at hard-discounters, which don't stock them -> their own brand instead.
//  - fresh produce (fruits, légumes) -> sold loose, no brand ("au kg").

// Store label -> its house/MDD brand shown on each line. Fallback: none until a store is chosen.
export const CHAIN_MDD: Record<string, string> = {
  Carrefour: "Carrefour",
  "E.Leclerc": "Marque Repère",
  Auchan: "Auchan",
  Intermarché: "Top Budget",
  "Super U": "U",
  Netto: "Netto",
  Cora: "Cora",
  Casino: "Casino",
  Monoprix: "Monoprix",
  Franprix: "Franprix",
  Naturalia: "Naturalia",
  Chronodrive: "Auchan",
  Lidl: "Lidl",
  Aldi: "Aldi",
};

// Hard-discounters sell almost only their own label — no national brands, even the icons.
const DISCOUNTERS = new Set(["Lidl", "Aldi"]);

// Fresh produce is sold loose by weight: no brand, no pack count.
const LOOSE_CATS = new Set(["fruits", "legumes"]);

// Foods worth showing with their national brand (it's the product people picture). Some of these
// food ids ARE a brand product on their own (Babybel, Kiri...). Only applied outside discounters.
const ICON_BRANDS: Record<string, string> = {
  "pate-tartiner": "Nutella",
  "soda-cola": "Coca-Cola",
  ketchup: "Heinz",
  mayonnaise: "Amora",
  moutarde: "Amora",
  "chocolat-poudre": "Nesquik",
  "chocolat-chaud": "Nesquik",
  speculoos: "Lotus",
  "vache-qui-rit": "La Vache qui rit",
  kiri: "Kiri",
  babybel: "Babybel",
  boursin: "Boursin",
  knacki: "Knacki",
  "sauce-soja": "Kikkoman",
  nutella: "Nutella",
};

// Returns the brand to show for a food at a given store, or null when it's sold loose / no store yet.
export function brandFor(foodId: string, category: string, chainLabel: string | null | undefined): string | null {
  if (LOOSE_CATS.has(category)) return null;
  const mdd = (chainLabel && CHAIN_MDD[chainLabel]) || null;
  if (chainLabel && DISCOUNTERS.has(chainLabel)) return mdd; // discounter: own brand for everything
  return ICON_BRANDS[foodId] ?? mdd; // icon national brand, else the store's MDD
}

// Common national brands per food, curated by hand (best-effort — NOT verified against a store's
// real stock, since no free API lists a chain's inventory). Used for the "swap brand" option: the
// store's own brand + these are the choices offered. Foods not listed fall back to [MDD, icon brand].
const FOOD_BRANDS: Record<string, string[]> = {
  pates: ["Barilla", "Panzani", "Lustucru"],
  riz: ["Taureau Ailé", "Uncle Ben's", "Lustucru"],
  semoule: ["Ferrero", "Tipiak", "Panzani"],
  farine: ["Francine", "Gruau d'Or"],
  lait: ["Lactel", "Candia", "Grandlait"],
  "lait-amande": ["Alpro", "Bjorg"],
  "lait-soja": ["Alpro", "Sojasun"],
  beurre: ["Président", "Elle & Vire", "Paysan Breton"],
  "creme-fraiche": ["Elle & Vire", "Président", "Bridélice"],
  "creme-liquide": ["Elle & Vire", "Bridélice"],
  yaourt: ["Danone", "Yoplait", "La Laitière"],
  "yaourt-fruits": ["Danone", "Yoplait"],
  "yaourt-grec": ["Fage", "Danone"],
  "fromage-rape": ["Président", "Entremont"],
  camembert: ["Président", "Cœur de Lion"],
  oeufs: ["Matines", "Loué", "Le Gaulois"],
  poulet: ["Le Gaulois", "Maître Coq", "Loué"],
  boeuf: ["Charal", "Bigard"],
  "steak-hache": ["Charal", "Bigard"],
  jambon: ["Herta", "Fleury Michon", "Aoste"],
  lardons: ["Herta", "Fleury Michon"],
  saumon: ["Labeyrie", "Petit Navire"],
  thon: ["Petit Navire", "Saupiquet"],
  "sauce-tomate": ["Barilla", "Panzani", "Buitoni"],
  "concentre-tomate": ["Mutti", "Panzani"],
  cereales: ["Kellogg's", "Nestlé", "Jordans"],
  confiture: ["Bonne Maman", "Andros"],
  miel: ["Lune de Miel", "Famille Michaud"],
  "jus-orange": ["Tropicana", "Joker", "Andros"],
  "jus-pomme": ["Andros", "Joker"],
  chips: ["Lay's", "Vico", "Bret's"],
  "huile-olive": ["Puget", "Carapelli"],
  "huile-tournesol": ["Fruit d'Or", "Lesieur"],
  cafe: ["Carte Noire", "L'Or", "Grand-Mère"],
  the: ["Lipton", "Elephant"],
  eau: ["Cristaline", "Evian", "Volvic"],
  "eau-plate": ["Cristaline", "Evian", "Volvic"],
  "eau-gazeuse": ["Perrier", "San Pellegrino", "Badoit"],
  biere: ["Heineken", "1664", "Leffe"],
  tofu: ["Bjorg", "Sojasun"],
  "haricots-rouges": ["Bonduelle", "Cassegrain"],
  "pois-chiches": ["Bonduelle", "Cassegrain"],
  mais: ["Bonduelle", "Géant Vert"],
  lentilles: ["Sabarot", "Bonduelle"],
  pizza: ["Buitoni", "Dr. Oetker", "Sodebo"],
};

// Ordered brand choices for a food at a store: its own brand first (default), then the national
// brands people know. Empty for loose produce (no brand). Discounters keep only their own label.
export function brandsFor(foodId: string, category: string, chainLabel: string | null | undefined): string[] {
  if (LOOSE_CATS.has(category)) return [];
  const mdd = (chainLabel && CHAIN_MDD[chainLabel]) || null;
  if (chainLabel && DISCOUNTERS.has(chainLabel)) return mdd ? [mdd] : [];
  const nat = FOOD_BRANDS[foodId] ?? (ICON_BRANDS[foodId] ? [ICON_BRANDS[foodId]] : []);
  return [...new Set([...(mdd ? [mdd] : []), ...nat])];
}

// Heuristic price ladder across a food's brand list (ordered cheapest -> priciest: the store MDD
// first, then national/premium brands). The store brand sits ~25% below the plain estimate, the
// priciest ~25% above, and the MEDIAN brand lands on the estimate (factor 1) — so the default
// (median) total ≈ the plain estimate. It's an ESTIMATE: real per-brand prices need a price feed.
export function brandPriceFactor(brandIndex: number, brandCount: number): number {
  if (brandCount <= 1) return 1;
  const t = brandIndex / (brandCount - 1); // 0 = cheapest brand, 1 = priciest
  return 1 + 0.25 * (2 * t - 1); // 0.75 .. 1.25, centered on 1 at the median
}

// ---- Packaging (how the product is sold) -> drives the "x N packs" count ----

export type Pack =
  | { kind: "weight"; g: number; format: string } // buy ceil(neededG / g) packs
  | { kind: "count"; per: number; format: string; word?: string }; // buy ceil(neededUnits / per) packs

// Default pack per category (covers every food); overridden per-food below where a format is iconic.
const PACK_BY_CAT: Record<string, Pack> = {
  viandes: { kind: "weight", g: 450, format: "barquette" },
  poissons: { kind: "weight", g: 400, format: "filets" },
  charcuterie: { kind: "weight", g: 200, format: "paquet" },
  feculents: { kind: "weight", g: 500, format: "paquet" },
  laitages: { kind: "weight", g: 250, format: "pot" },
  fromages: { kind: "weight", g: 200, format: "portion" },
  plats: { kind: "weight", g: 400, format: "barquette" },
  salades: { kind: "weight", g: 300, format: "barquette" },
  soupes: { kind: "weight", g: 1000, format: "brique 1 L" },
  quiches: { kind: "weight", g: 600, format: "quiche" },
  extras: { kind: "weight", g: 220, format: "pot" },
  "petit-dej": { kind: "weight", g: 500, format: "paquet" },
  boulangerie: { kind: "count", per: 1, format: "pièce", word: "pièce" },
  boissons: { kind: "weight", g: 1000, format: "bouteille 1 L" },
  sucre: { kind: "weight", g: 300, format: "paquet" },
  apero: { kind: "weight", g: 150, format: "paquet" },
  epices: { kind: "weight", g: 40, format: "pot" },
  "fruits-secs": { kind: "weight", g: 200, format: "sachet" },
  "bio-vegetal": { kind: "weight", g: 250, format: "paquet" },
};

// Per-food overrides for packaging everyone recognizes.
const PACK_OVR: Record<string, Pack> = {
  oeufs: { kind: "count", per: 6, format: "boîte de 6", word: "boîte" },
  omelette: { kind: "count", per: 6, format: "boîte de 6", word: "boîte" },
  yaourt: { kind: "count", per: 4, format: "pack de 4", word: "pack" },
  "yaourt-fruits": { kind: "count", per: 4, format: "pack de 4", word: "pack" },
  "yaourt-grec": { kind: "count", per: 4, format: "pack de 4", word: "pack" },
  "petit-suisse": { kind: "count", per: 6, format: "pack de 6", word: "pack" },
  faisselle: { kind: "weight", g: 500, format: "pot 500 g" },
  lait: { kind: "weight", g: 1000, format: "brique 1 L" },
  "lait-amande": { kind: "weight", g: 1000, format: "brique 1 L" },
  "lait-soja": { kind: "weight", g: 1000, format: "brique 1 L" },
  "lait-coco": { kind: "weight", g: 400, format: "boîte 40 cl" },
  riz: { kind: "weight", g: 1000, format: "paquet 1 kg" },
  pates: { kind: "weight", g: 500, format: "paquet 500 g" },
  semoule: { kind: "weight", g: 500, format: "paquet 500 g" },
  farine: { kind: "weight", g: 1000, format: "paquet 1 kg" },
  pain: { kind: "count", per: 1, format: "baguette", word: "baguette" },
  baguette: { kind: "count", per: 1, format: "baguette", word: "baguette" },
  croissant: { kind: "count", per: 4, format: "sachet de 4", word: "sachet" },
  "pain-chocolat": { kind: "count", per: 4, format: "sachet de 4", word: "sachet" },
  "pain-de-mie": { kind: "count", per: 1, format: "paquet", word: "paquet" },
  pizza: { kind: "count", per: 1, format: "pizza", word: "pizza" },
  quiche: { kind: "count", per: 1, format: "quiche", word: "quiche" },
  "huile-olive": { kind: "weight", g: 750, format: "bouteille 75 cl" },
  "huile-tournesol": { kind: "weight", g: 1000, format: "bouteille 1 L" },
  "pate-tartiner": { kind: "weight", g: 400, format: "pot 400 g" },
  "sauce-tomate": { kind: "weight", g: 400, format: "bocal 400 g" },
  "concentre-tomate": { kind: "weight", g: 140, format: "boîte 140 g" },
  "soda-cola": { kind: "weight", g: 1500, format: "bouteille 1,5 L" },
  limonade: { kind: "weight", g: 1500, format: "bouteille 1,5 L" },
  "jus-orange": { kind: "weight", g: 1000, format: "brique 1 L" },
  "jus-pomme": { kind: "weight", g: 1000, format: "brique 1 L" },
  "jus-multifruits": { kind: "weight", g: 1000, format: "brique 1 L" },
  "eau-plate": { kind: "count", per: 6, format: "pack de 6", word: "pack" },
  "eau-gazeuse": { kind: "count", per: 6, format: "pack de 6", word: "pack" },
  biere: { kind: "count", per: 6, format: "pack de 6", word: "pack" },
  ketchup: { kind: "weight", g: 500, format: "flacon 500 g" },
  beurre: { kind: "weight", g: 250, format: "plaquette 250 g" },
  confiture: { kind: "weight", g: 370, format: "pot 370 g" },
  miel: { kind: "weight", g: 250, format: "pot 250 g" },
  cereales: { kind: "weight", g: 500, format: "paquet 500 g" },
  chips: { kind: "weight", g: 150, format: "paquet 150 g" },
  camembert: { kind: "count", per: 1, format: "boîte", word: "boîte" },
  "creme-fraiche": { kind: "weight", g: 200, format: "pot 20 cl" },
  "creme-liquide": { kind: "weight", g: 200, format: "brique 20 cl" },
  "fromage-rape": { kind: "weight", g: 200, format: "sachet 200 g" },
  "haricots-rouges": { kind: "weight", g: 400, format: "boîte 400 g" },
  "pois-chiches": { kind: "weight", g: 400, format: "boîte 400 g" },
  lentilles: { kind: "weight", g: 500, format: "paquet 500 g" },
  mais: { kind: "weight", g: 300, format: "boîte 300 g" },
  tofu: { kind: "weight", g: 200, format: "bloc 200 g" },
};

export function packFor(foodId: string, category: string): Pack {
  return PACK_OVR[foodId] ?? PACK_BY_CAT[category] ?? { kind: "weight", g: 500, format: "paquet" };
}

export function isLooseCategory(category: string): boolean {
  return LOOSE_CATS.has(category);
}
