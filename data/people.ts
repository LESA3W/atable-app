import type { PersonId } from "@/lib/types";

export interface Person {
  id: PersonId;
  label: string;
  initials: string;
  color: string;
  photo?: string; // optional custom avatar (data URL); falls back to the initials circle
  textColor?: string; // optional override; else Avatar auto-contrasts from `color`
}

// "moi" is the mother herself (she is the one using the app day to day).
// Default avatars: solid color circle + initials (text colour auto-contrasts in Avatar).
export const PEOPLE: Person[] = [
  { id: "marc", label: "Papa", initials: "M", color: "#DB4437" },
  { id: "paul", label: "Paul", initials: "P", color: "#4285F4" },
  { id: "louis", label: "Louis", initials: "L", color: "#0F9D58" },
  { id: "moi", label: "Maman", initials: "AK", color: "#AB47BC" },
  { id: "ninon", label: "Ninon", initials: "N", color: "#F48FB1", textColor: "#ffffff" },
  { id: "anya", label: "Anya", initials: "A", color: "#D81B60" },
];

export const PERSON_IDS: PersonId[] = PEOPLE.map((p) => p.id);

export function personLabel(id: string): string {
  return PEOPLE.find((p) => p.id === id)?.label ?? id;
}
