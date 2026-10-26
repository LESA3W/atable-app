import { DISHES } from "@/data/dishes";
import { brandFor, brandsFor, brandPriceFactor, isLooseCategory, packFor } from "@/data/brands";
import { CATEGORIES, FOOD_BY_ID, foodLabel } from "@/data/foods";
import { priceModel, storeIndex } from "@/data/prices";
import type { Dish, MealPlanEntry } from "@/lib/types";

const DISH_BY_ID: Record<string, Dish> = Object.fromEntries(DISHES.map((d) => [d.id, d]));

export type EstItem = { foodId: string; label: string; brand: string | null; qtyLabel: string; priceEur: number; addedBy: string[] };
export type EstGroup = { catId: string; emoji: string; icon: string; label: string; items: EstItem[] };
export type Estimate = { groups: EstGroup[]; totalEur: number; itemCount: number };

// Round grams up to a friendly purchase amount (50 g steps under 1 kg, 100 g above).
function roundGrams(g: number): number {
  return g < 1000 ? Math.max(50, Math.ceil(g / 50) * 50) : Math.ceil(g / 100) * 100;
}
function weightText(g: number): string {
  return g >= 1000 ? `≈ ${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1)} kg` : `≈ ${g} g`;
}
// Append the pack size to a bare format word ("barquette" -> "barquette 450 g"); leave it if it
// already carries a number ("brique 1 L").
function weightFormat(format: string, g: number): string {
  if (/\d/.test(format)) return format;
  const size = g >= 1000 ? `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1)} kg` : `${g} g`;
  return `${format} ${size}`;
}
function plural(label: string, n: number): string {
  if (n <= 1 || label.endsWith("s") || label.endsWith("x")) return label;
  return `${label}s`;
}

// Aggregate the week's meals into an estimated shopping list for one chain. Each line resolves to a
// concrete product: a brand (the store's MDD, an icon national brand, or none for loose produce),
// a recognizable pack format, and how many packs to buy (x N). Quantities scale with the number of
// people at each meal. It's an estimate — the real product and price show on the retailer's site.
export function estimateList(entries: MealPlanEntry[], chainLabel: string | null, householdSize: number): Estimate {
  const idx = storeIndex(chainLabel);
  const acc: Record<string, { g: number; units: number }> = {};
  const addedByAcc: Record<string, Set<string>> = {}; // food -> members who put a meal using it

  for (const e of entries) {
    const dish = DISH_BY_ID[e.dishId];
    if (!dish) continue;
    const people = ((e.diners?.length ?? 0) + (e.guests ?? 0)) || householdSize || 2;
    for (const ing of dish.ingredients) {
      const cat = FOOD_BY_ID[ing]?.category ?? "extras";
      const m = priceModel(ing, cat);
      const a = (acc[ing] ??= { g: 0, units: 0 });
      if (m.mode === "unit") a.units += m.perServing * people;
      else a.g += m.servG * people;
      if (e.addedBy) (addedByAcc[ing] ??= new Set()).add(e.addedBy);
    }
  }

  const byCat: Record<string, EstItem[]> = {};
  let total = 0;
  for (const [foodId, q] of Object.entries(acc)) {
    const cat = FOOD_BY_ID[foodId]?.category ?? "extras";
    const line = foodLine(foodId, cat, q, chainLabel, idx);
    total += line.priceEur;
    (byCat[cat] ??= []).push({ foodId, label: foodLabel(foodId), brand: line.brand, qtyLabel: line.qtyLabel, priceEur: line.priceEur, addedBy: [...(addedByAcc[foodId] ?? [])] });
  }

  const groups: EstGroup[] = CATEGORIES.map((c) => ({
    catId: c.id,
    emoji: c.emoji,
    icon: c.icon,
    label: c.label,
    items: (byCat[c.id] ?? []).sort((a, b) => a.label.localeCompare(b.label, "fr")),
  })).filter((g) => g.items.length > 0);

  return { groups, totalEur: total, itemCount: Object.keys(acc).length };
}

// One shopping line for a food given its needed quantity (grams / units). Shared by the aggregated
// list and the per-dish list so packaging + pricing stay identical. `packsOverride` lets the user
// bump the pack count (or the weight multiple, for loose produce) up/down; the price scales with it.
function foodLine(
  foodId: string,
  cat: string,
  q: { g: number; units: number },
  chainLabel: string | null,
  idx: number,
  packsOverride?: number,
): { brand: string | null; qtyLabel: string; priceEur: number; packs: number; loose: boolean } {
  const m = priceModel(foodId, cat);
  const brand = brandFor(foodId, cat, chainLabel);

  if (isLooseCategory(cat) && m.mode === "weight") {
    const baseG = roundGrams(q.g);
    const mult = Math.max(1, packsOverride ?? 1);
    const g = baseG * mult;
    return { brand, qtyLabel: `au kg · ${weightText(g)}`, priceEur: (g / 1000) * m.eurKg * idx, packs: mult, loose: true };
  }
  if (m.mode === "unit") {
    const pack = packFor(foodId, cat);
    const per = pack.kind === "count" ? pack.per : 1;
    const packs = Math.max(1, packsOverride ?? Math.ceil(q.units / per));
    const price = packs * (m.eurUnit * per) * idx;
    const qtyLabel =
      per > 1 && pack.kind === "count"
        ? `${pack.format} · ×${packs}`
        : `×${packs} ${plural(pack.kind === "count" && pack.word ? pack.word : m.unitLabel, packs)}`;
    return { brand, qtyLabel, priceEur: price, packs, loose: false };
  }
  const pack = packFor(foodId, cat);
  const packG = pack.kind === "weight" ? pack.g : 500;
  const packs = Math.max(1, packsOverride ?? Math.ceil(q.g / packG));
  const price = packs * (packG / 1000) * m.eurKg * idx;
  const fmt = pack.kind === "weight" ? weightFormat(pack.format, pack.g) : pack.format;
  return { brand, qtyLabel: `${fmt} · ×${packs}`, priceEur: price, packs, loose: false };
}

export type DishProduct = { foodId: string; label: string; brand: string | null; brands: string[]; qtyLabel: string; priceEur: number; minEur: number; maxEur: number; packs: number; loose: boolean };
export type DishGroup = {
  key: string; // date|slot|dishId — the unique planned-meal instance
  dishId: string;
  dishName: string;
  course: string;
  diners: string[]; // member ids the meal is for
  guests: number; // extra anonymous guests, already counted into `people`
  people: number;
  addedBy: string | null; // who planned the meal (only they may remove its products)
  products: DishProduct[];
  ingredientCount: number;
  totalEur: number;
  minEur: number; // this dish's total if every product took its cheapest brand
  maxEur: number; // ...and its priciest brand — the budget slider's bounds
};

// The week's meals as one section per planned dish, each with its own products (quantities scaled to
// that meal's people). The same food can appear under several dishes — this is a "what each meal
// needs" view, not the aggregated basket. `overrides` maps `${dishKey}|${foodId}` -> a pack override.
export function estimateByDish(
  entries: MealPlanEntry[],
  chainLabel: string | null,
  householdSize: number,
  overrides: Record<string, number> = {},
  budgetLevel = 0.5, // 0 = cheapest brand everywhere, 0.5 = median (default), 1 = priciest
  brandOverrides: Record<string, string> = {}, // per-product manual brand swaps win over the slider
): DishGroup[] {
  const idx = storeIndex(chainLabel);
  const groups: DishGroup[] = [];
  for (const e of entries) {
    const dish = DISH_BY_ID[e.dishId];
    if (!dish) continue;
    const people = ((e.diners?.length ?? 0) + (e.guests ?? 0)) || householdSize || 2;
    const key = `${e.date}|${e.slot}|${e.dishId}`;
    const products: DishProduct[] = [];
    let total = 0;
    let totalMin = 0;
    let totalMax = 0;
    for (const ing of dish.ingredients) {
      const cat = FOOD_BY_ID[ing]?.category ?? "extras";
      const m = priceModel(ing, cat);
      const q = m.mode === "unit" ? { g: 0, units: m.perServing * people } : { g: m.servG * people, units: 0 };
      const k = `${key}|${ing}`;
      const base = foodLine(ing, cat, q, chainLabel, idx, overrides[k]);
      const brands = brandsFor(ing, cat, chainLabel);
      const n = brands.length;
      // Which brand the budget slider lands on for this food (median by default); a manual swap wins.
      let sel = n > 1 ? Math.round(budgetLevel * (n - 1)) : 0;
      const ov = brandOverrides[k];
      if (ov) {
        const oi = brands.indexOf(ov);
        if (oi >= 0) sel = oi;
      }
      const priceEur = base.priceEur * brandPriceFactor(sel, n);
      const minEur = base.priceEur * brandPriceFactor(0, n);
      const maxEur = base.priceEur * brandPriceFactor(Math.max(0, n - 1), n);
      const brand = n > 0 ? brands[sel] : base.brand;
      total += priceEur;
      totalMin += minEur;
      totalMax += maxEur;
      products.push({ foodId: ing, label: foodLabel(ing), brand, brands, qtyLabel: base.qtyLabel, priceEur, minEur, maxEur, packs: base.packs, loose: base.loose });
    }
    groups.push({ key, dishId: e.dishId, dishName: e.dishName || dish.name, course: e.course, diners: e.diners ?? [], guests: e.guests ?? 0, people, addedBy: e.addedBy ?? null, products, ingredientCount: dish.ingredients.length, totalEur: total, minEur: totalMin, maxEur: totalMax });
  }
  return groups;
}

export function euro(n: number): string {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
}
