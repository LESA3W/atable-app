import { DISHES } from "@/data/dishes";
import { FOOD_BY_ID, foodLabel } from "@/data/foods";
import type { Course, Dish, PreferenceMap, Status } from "@/lib/types";

export type Color = "vert" | "orange" | "rouge" | "gris";

// Member IDs are kept (not display names) so the UI can render avatars + resolve names itself.
export interface IngredientResult {
  foodId: string;
  label: string;
  category: string; // drives the ingredient emoji on the chip
  color: Color;
  lovers: string[]; // O + favorite -> coup de cœur
  likers: string[]; // O, not a favorite -> aime
  tolerant: string[]; // M -> moyen / tolère
  haters: string[]; // N -> aime pas
}

export interface DishResult {
  dish: Dish;
  color: Color;
  ingredients: IngredientResult[];
}

type Favorites = Record<string, string[]>; // person id -> favorited food ids

// Worst status wins for the colour: a single N makes it red, a single M makes it orange. A favourite
// is still an O (green) — it only upgrades the person from "aime" to "coup de cœur" on the chip.
function evaluateIngredient(
  foodId: string,
  diners: string[],
  prefs: PreferenceMap,
  favorites: Favorites,
): IngredientResult {
  const lovers: string[] = [];
  const likers: string[] = [];
  const tolerant: string[] = [];
  const haters: string[] = [];

  for (const person of diners) {
    const status: Status | undefined = prefs[person]?.[foodId];
    if (status === "N") haters.push(person);
    else if (status === "M") tolerant.push(person);
    else if (status === "O") {
      if (favorites[person]?.includes(foodId)) lovers.push(person);
      else likers.push(person);
    }
    // anything else = not rated -> intentionally ignored (no chip, per the UI)
  }

  let color: Color = "gris"; // nobody rated it
  if (haters.length > 0) color = "rouge";
  else if (tolerant.length > 0) color = "orange";
  else if (lovers.length > 0 || likers.length > 0) color = "vert";

  return { foodId, label: foodLabel(foodId), category: FOOD_BY_ID[foodId]?.category ?? "", color, lovers, likers, tolerant, haters };
}

const ORDER: Record<Color, number> = { vert: 0, gris: 1, orange: 2, rouge: 3 };

export function evaluateDish(
  dish: Dish,
  diners: string[],
  prefs: PreferenceMap,
  favorites: Favorites = {},
): DishResult {
  const ingredients = dish.ingredients.map((id) => evaluateIngredient(id, diners, prefs, favorites));

  let color: Color = "vert";
  if (ingredients.some((i) => i.color === "rouge")) color = "rouge";
  else if (ingredients.some((i) => i.color === "orange")) color = "orange";
  else if (ingredients.every((i) => i.color === "gris")) color = "gris";

  return { dish, color, ingredients };
}

export function generate(
  diners: string[],
  prefs: PreferenceMap,
  course: Course | "tout",
  favorites: Favorites = {},
): DishResult[] {
  const pool = course === "tout" ? DISHES : DISHES.filter((d) => d.course === course);

  return pool
    .map((dish) => evaluateDish(dish, diners, prefs, favorites))
    .sort((a, b) => {
      if (ORDER[a.color] !== ORDER[b.color]) return ORDER[a.color] - ORDER[b.color];
      return a.dish.name.localeCompare(b.dish.name, "fr");
    });
}
