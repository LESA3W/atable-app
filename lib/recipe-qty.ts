// Recipe quantities that STAY COHERENT with the shopping list. The basket (lib/estimate.ts) already
// scales every ingredient by the meal's people (servG x people); the recipe text, though, had amounts
// baked into the prose ("500 g de fraises") for a fixed ~4-person base, so a solo cook saw 500 g in
// the recipe while the basket said 100 g. This module derives quantities from the SAME engine so both
// match by construction, and scales them live with the number of diners.
//
// Two outputs, both automatic (no per-recipe data — a new dish is scaled for free):
//   - mealIngredients(dishId, people): the clean "Ingredients for N" list (= the basket).
//   - scaleSteps(steps, dishId, people): rewrites the numbers inside the step prose to match.
import { DISHES } from "@/data/dishes";
import { FOOD_BY_ID, foodLabel } from "@/data/foods";
import { priceModel } from "@/data/prices";

const DISH_BY_ID = Object.fromEntries(DISHES.map((d) => [d.id, d]));

// The people count the legacy recipe prose was written for. Only used as a fallback, for numbers we
// can't tie to a known ingredient (aromatics, "3 cuillères", odd amounts) — the primary ingredients
// go through the engine and are exact.
const PROSE_BASE = 4;

// Composite "dish" foods (a whole gratin, a bolognaise, an omelette...) exist for the generator and
// the price estimate, but they make a nonsense ingredient line ("Gratin dauphinois 90 g"). Keep them
// out of the human ingredient list; the real components (potatoes, ham, eggs...) carry the meaning.
// Most sit in a composite category; a handful were filed under a real-food category, listed explicitly.
const COMPOSITE_CATS = new Set(["plats", "salades", "soupes", "quiches"]);
const COMPOSITE_IDS = new Set(["gratin-dauphinois", "omelette", "ratatouille"]);

// Words the prose uses that don't equal the food id/label, so the matcher can still tie them together
// (food id -> extra prose spellings).
const ALIAS: Record<string, string[]> = {
  courge: ["potiron"],
  pates: ["spaghetti", "tagliatelles", "vermicelles", "nouilles", "coquillettes"],
  "pommes-de-terre": ["patates"],
  "steak-hache": ["boeuf", "bœuf", "viande hachee", "viande hachée"],
  "fromage-dur": ["gruyere", "gruyère", "emmental", "comte", "comté", "parmesan"],
  oeufs: ["jaunes", "blancs"],
};

export type CookIngredient = { foodId: string; label: string; qty: string };

// ---------- formatting ----------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[’']/g, "'");
}

// A cooking weight, rounded to a friendly amount (nearest 10 g under 1 kg, 1 decimal kg above).
function fmtWeight(grams: number): string {
  const g = Math.max(10, Math.round(grams / 10) * 10);
  if (g >= 1000) {
    const kg = g / 1000;
    return `${kg.toFixed(kg % 1 === 0 ? 0 : 1).replace(".", ",")} kg`;
  }
  return `${g} g`;
}

// A volume in the prose (cl / L), scaled and kept readable (round cl to 5, promote to L at 100 cl).
function fmtVolumeCl(cl: number): string {
  const v = Math.max(5, Math.round(cl / 5) * 5);
  if (v >= 100) {
    const l = v / 100;
    return `${l.toFixed(l % 1 === 0 ? 0 : 1).replace(".", ",")} L`;
  }
  return `${v} cl`;
}

// Small unit counts, with the common French halves as fractions (½ avocat, 1 melon).
function fmtCount(n: number): string {
  const rounded = Math.round(n * 2) / 2; // nearest half
  if (rounded <= 0.5) return "½";
  if (Number.isInteger(rounded)) return String(rounded);
  return `${Math.floor(rounded)} ½`;
}

function pluralizeLast(noun: string, n: number): string {
  // Only the last word carries the plural ("gros oignons" -> "gros oignon").
  const parts = noun.split(/\s+/);
  const last = parts[parts.length - 1];
  const singular = n <= 1;
  if (singular && /s$/i.test(last) && !/(x|as|is|os|us)$/i.test(last)) {
    parts[parts.length - 1] = last.replace(/s$/i, "");
  } else if (!singular && !/(s|x)$/i.test(last)) {
    parts[parts.length - 1] = `${last}s`;
  }
  return parts.join(" ");
}

// ---------- the engine ----------

// Cooking quantity for one food at `people` diners, straight from the pricing/serving model that the
// basket uses — so the recipe and the shopping list can never disagree. `inline` keeps the noun for
// use inside a step ("2 œufs"); `panel` drops it when the ingredient list already shows the label
// ("Œufs · 2", not "Œufs · 2 œufs").
function cookQty(
  foodId: string,
  people: number,
): { inline: string; panel: string; weightG: number | null; count: number | null } {
  const cat = FOOD_BY_ID[foodId]?.category ?? "extras";
  const m = priceModel(foodId, cat);
  const n = Math.max(1, people);
  if (m.mode === "unit") {
    const c = m.perServing * n;
    const noun = pluralizeLast(m.unitLabel, Math.round(c));
    const redundant = normalize(foodLabel(foodId)).includes(normalize(m.unitLabel));
    return { inline: `${fmtCount(c)} ${noun}`, panel: redundant ? fmtCount(c) : `${fmtCount(c)} ${noun}`, weightG: null, count: c };
  }
  const g = m.servG * n;
  const t = fmtWeight(g);
  return { inline: t, panel: t, weightG: g, count: null };
}

// A composite "dish food" is one in a composite category (plats/salades/...) or on the explicit list.
function isComposite(ing: string): boolean {
  return COMPOSITE_IDS.has(ing) || COMPOSITE_CATS.has(FOOD_BY_ID[ing]?.category ?? "extras");
}

// The "Ingredients for N people" list for a dish — the same foods, and the same quantities, the basket
// would buy for this meal. Composite dish-foods are dropped so the list reads like real ingredients.
// Empty for an unknown dish.
export function mealIngredients(dishId: string, people: number): CookIngredient[] {
  const dish = DISH_BY_ID[dishId];
  if (!dish) return [];
  return dish.ingredients
    .filter((ing) => !isComposite(ing))
    .map((ing) => ({ foodId: ing, label: foodLabel(ing), qty: cookQty(ing, people).panel }));
}

// Build a matcher for THIS dish's ingredients only (a tiny set), so a noun in the prose can be tied
// back to a real food. Matching against the whole food table would be noisy; the dish's 2-4 foods are
// enough and keep false positives near zero.
function dishMatcher(dishId: string): { needles: { key: string; foodId: string }[] } {
  const dish = DISH_BY_ID[dishId];
  const needles: { key: string; foodId: string }[] = [];
  for (const ing of dish?.ingredients ?? []) {
    needles.push({ key: normalize(ing.replace(/-/g, " ")), foodId: ing });
    const label = normalize(foodLabel(ing)).split("/")[0].trim(); // "Jambon cru / charcuterie" -> "jambon cru"
    if (label && label !== normalize(ing)) needles.push({ key: label, foodId: ing });
    for (const alt of ALIAS[ing] ?? []) needles.push({ key: normalize(alt), foodId: ing });
  }
  // Longest key first so "pommes de terre" wins over a bare "pommes".
  needles.sort((a, b) => b.key.length - a.key.length);
  return { needles };
}

// Find which of the dish's ingredients (if any) the text right after an amount refers to.
function matchFood(after: string, needles: { key: string; foodId: string }[]): string | null {
  const hay = normalize(after);
  for (const n of needles) {
    if (n.key.length >= 3 && hay.includes(n.key)) return n.foodId;
  }
  return null;
}

// Units that are food quantities (scale) vs everything else. Temperatures/times use deg/min/h and are
// never matched here, so they're left untouched.
const WEIGHT_UNIT = /^(kg|g)$/;
const VOLUME_UNIT = /^(cl|ml|l)$/;

// Countable nouns that appear in the prose with a leading number and genuinely scale. Measures
// (cuillère, pincée, louche, verre, cube, boîte) are intentionally excluded — they don't scale cleanly
// and reading "0,5 cuillère" is worse than leaving them.
const COUNTABLE =
  "oeufs?|œufs?|oignons?|tomates?|carottes?|avocats?|pommes?|bananes?|poireaux?|betteraves?|filets?|paves?|pavés?|steaks?|boules?|tranches?|gousses?|melons?|ananas|concombres?|poivrons?|echalotes?|échalotes?|citrons?|kiwis?";

function scaleFallback(n: number, people: number): number {
  return (n * Math.max(1, people)) / PROSE_BASE;
}

// Rewrite the numbers inside one dish's recipe steps so they read for `people`. Primary ingredients
// resolve through the engine (exact, = the basket); anything else scales from the ~4-person base. Units
// tied to time/temperature are never touched. Grammar-safe: only numbers change (+ plural agreement).
export function scaleSteps(steps: string[], dishId: string, people: number): string[] {
  const { needles } = dishMatcher(dishId);
  const n = Math.max(1, people);

  // Weight / volume amounts: "500 g de fraises", "20 cl de crème", "1 kg de pommes de terre".
  const weightRe = /(\d+(?:[.,]\d+)?)\s*(kg|g|cl|ml|l)\b([^.,;:!?]*)/gi;
  // Bare counts: "6 œufs", "4 gros oignons", "2 filets de poulet".
  const countRe = new RegExp(`(\\d+)(\\s+(?:gros(?:se)?s?\\s+|petits?\\s+)?(?:${COUNTABLE})\\b)`, "gi");

  return steps.map((step) => {
    let out = step.replace(weightRe, (whole, num, unit, tail) => {
      const u = unit.toLowerCase();
      const foodId = matchFood(tail, needles);
      if (foodId) {
        const q = cookQty(foodId, n);
        if (q.weightG != null) return `${q.inline}${tail}`;
      }
      const val = parseFloat(String(num).replace(",", "."));
      if (!Number.isFinite(val)) return whole;
      const scaled = scaleFallback(val, n);
      if (WEIGHT_UNIT.test(u)) return `${fmtWeight(u === "kg" ? scaled * 1000 : scaled)}${tail}`;
      if (VOLUME_UNIT.test(u)) return `${fmtVolumeCl(u === "l" ? scaled * 100 : scaled)}${tail}`;
      return whole;
    });

    out = out.replace(countRe, (whole, num, nounPart) => {
      const foodId = matchFood(nounPart, needles);
      if (foodId) {
        const q = cookQty(foodId, n);
        if (q.count != null) {
          const cleaned = nounPart.replace(/^\s+/, "");
          return `${fmtCount(q.count)} ${pluralizeLast(cleaned, Math.round(q.count))}`;
        }
      }
      const val = parseInt(num, 10);
      if (!Number.isFinite(val)) return whole;
      const scaled = Math.max(1, Math.round(scaleFallback(val, n)));
      const cleaned = nounPart.replace(/^\s+/, "");
      return `${scaled} ${pluralizeLast(cleaned, scaled)}`;
    });

    return out;
  });
}
