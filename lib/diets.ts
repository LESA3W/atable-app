// Dietary restrictions chosen at sign-up (multi-select). Used to skip irrelevant
// categories during the taste onboarding (a vegan should not swipe through 40 meats).
// Stored as a text[] on the member; ids are validated server-side.
export type RestrictionId =
  | "sans-lactose"
  | "sans-gluten"
  | "sans-porc"
  | "vegan"
  | "vegetarien"
  | "pescetarien";

export interface Restriction {
  id: RestrictionId;
  label: string;
  emoji: string;
  excludeCategories: string[]; // category ids hidden in the onboarding swipe
}

export const RESTRICTIONS: Restriction[] = [
  { id: "sans-lactose", label: "Sans lactose", emoji: "🥛", excludeCategories: ["laitages", "fromages"] },
  { id: "sans-gluten", label: "Sans gluten", emoji: "🌾", excludeCategories: ["boulangerie"] },
  { id: "sans-porc", label: "Sans porc", emoji: "🚫", excludeCategories: [] },
  { id: "vegan", label: "Vegan", emoji: "🌱", excludeCategories: ["viandes", "charcuterie", "poissons", "laitages", "fromages"] },
  { id: "vegetarien", label: "Végétarien", emoji: "🥗", excludeCategories: ["viandes", "charcuterie", "poissons"] },
  { id: "pescetarien", label: "Pescétarien", emoji: "🐟", excludeCategories: ["viandes", "charcuterie"] },
];

export const RESTRICTION_IDS = RESTRICTIONS.map((r) => r.id);

// Union of the categories excluded by the chosen restrictions.
export function restrictionsToExcludes(restrictions: string[] | null | undefined): string[] {
  if (!restrictions?.length) return [];
  const out = new Set<string>();
  for (const id of restrictions) {
    RESTRICTIONS.find((r) => r.id === id)?.excludeCategories.forEach((c) => out.add(c));
  }
  return [...out];
}
