// Rough French grocery reference prices, used to ESTIMATE a shopping list. The REAL price shows
// up on the retailer's own site when the user orders — this is only an honest estimate so they
// know roughly what the week costs. Model = per-category base (€/kg + grams eaten per person) +
// notable per-item overrides + a per-chain price index (Lidl cheap, Monoprix pricey).

// Per-chain multiplier vs a mid-market baseline (Carrefour ~ 1.0). Rough public price positioning.
export const STORE_INDEX: Record<string, number> = {
  "E.Leclerc": 0.95,
  Carrefour: 1.0,
  Auchan: 0.97,
  Intermarché: 0.98,
  Netto: 0.87,
  "Super U": 1.02,
  Chronodrive: 1.0,
  Cora: 1.0,
  Casino: 1.12,
  Monoprix: 1.28,
  Franprix: 1.22,
  Naturalia: 1.5,
  Lidl: 0.83,
  Aldi: 0.82,
};

// category -> euro per kg + grams eaten per person per meal
const CAT: Record<string, { eurKg: number; servG: number }> = {
  viandes: { eurKg: 12, servG: 130 },
  poissons: { eurKg: 16, servG: 130 },
  charcuterie: { eurKg: 18, servG: 50 },
  legumes: { eurKg: 2.6, servG: 130 },
  feculents: { eurKg: 2, servG: 90 },
  laitages: { eurKg: 4, servG: 90 },
  fromages: { eurKg: 16, servG: 35 },
  fruits: { eurKg: 3, servG: 130 },
  plats: { eurKg: 8, servG: 250 },
  salades: { eurKg: 6, servG: 120 },
  soupes: { eurKg: 3, servG: 250 },
  quiches: { eurKg: 9, servG: 150 },
  extras: { eurKg: 5, servG: 30 },
};
const CAT_DEFAULT = { eurKg: 5, servG: 100 };

type Ovr = { eurKg?: number; servG?: number; eurUnit?: number; perServing?: number; unitLabel?: string };
// weighed override: eurKg/servG. countable override: eurUnit/perServing/unitLabel.
const OVR: Record<string, Ovr> = {
  // proteins
  saumon: { eurKg: 22 }, crevettes: { eurKg: 18 }, thon: { eurKg: 11 }, moules: { eurKg: 4 }, "poisson-pane": { eurKg: 9 },
  steak: { eurKg: 18 }, "steak-hache": { eurKg: 11 }, veau: { eurKg: 20 }, poulet: { eurKg: 9 }, merguez: { eurKg: 10 },
  saucisses: { eurKg: 9 }, "cordon-bleu": { eurKg: 9 }, "jambon-blanc": { eurKg: 14, servG: 50 }, "jambon-cru": { eurKg: 30, servG: 40 },
  lardons: { eurKg: 9, servG: 40 },
  oeufs: { eurUnit: 0.3, perServing: 2, unitLabel: "œuf" }, omelette: { eurUnit: 0.3, perServing: 3, unitLabel: "œuf" },
  // starches
  pates: { eurKg: 1.4, servG: 100 }, riz: { eurKg: 2, servG: 80 }, "pommes-de-terre": { eurKg: 1.5, servG: 200 },
  frites: { eurKg: 2.5, servG: 150 }, puree: { eurKg: 3, servG: 200 }, semoule: { eurKg: 2, servG: 80 },
  pain: { eurUnit: 1, perServing: 0.34, unitLabel: "baguette" }, "haricots-rouges": { eurKg: 3, servG: 100 },
  // dairy / cheese
  mozzarella: { eurKg: 8, servG: 60 }, feta: { eurKg: 12, servG: 40 }, "fromage-dur": { eurKg: 14, servG: 35 },
  yaourt: { eurUnit: 0.35, perServing: 1, unitLabel: "pot" }, "fromage-blanc": { eurKg: 3, servG: 100 },
  // veg / fruit
  avocat: { eurUnit: 1, perServing: 0.5, unitLabel: "avocat" }, betterave: { eurKg: 3 },
  fraises: { eurKg: 8, servG: 100 }, "fruits-rouges": { eurKg: 10, servG: 80 },
  melon: { eurUnit: 2, perServing: 0.4, unitLabel: "melon" }, ananas: { eurUnit: 2.5, perServing: 0.3, unitLabel: "ananas" },
  banane: { eurKg: 2 }, pomme: { eurKg: 2.5 }, orange: { eurKg: 2.5 },
  // ready dishes sold by the piece
  pizza: { eurUnit: 4, perServing: 0.5, unitLabel: "pizza" },
};

export type IngredientModel =
  | { mode: "weight"; eurKg: number; servG: number }
  | { mode: "unit"; eurUnit: number; perServing: number; unitLabel: string };

export function priceModel(foodId: string, category: string): IngredientModel {
  const o = OVR[foodId];
  if (o?.eurUnit != null) return { mode: "unit", eurUnit: o.eurUnit, perServing: o.perServing ?? 1, unitLabel: o.unitLabel ?? "pièce" };
  const base = CAT[category] ?? CAT_DEFAULT;
  return { mode: "weight", eurKg: o?.eurKg ?? base.eurKg, servG: o?.servG ?? base.servG };
}

export function storeIndex(chainLabel: string | null | undefined): number {
  return (chainLabel && STORE_INDEX[chainLabel]) || 1;
}
