// Avatar initials = first letter of each part of the (possibly composite) first name.
// "Paul" -> "P", "Pierre Antoine" -> "PA", "Pierre-Antoine" -> "PA".
export function computeInitials(name: string): string {
  const parts = name.trim().split(/[\s-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 3)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export const AVATAR_PALETTE = [
  "#DB4437", "#4285F4", "#0F9D58", "#AB47BC", "#D81B60",
  "#00ACC1", "#FB8C00", "#5E35B1", "#43A047", "#EC407A",
];

// Deterministic avatar colour from a stable seed (e.g. email), so it never changes.
export function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// Random avatar colour: a fresh palette pick every time a profile is created.
export function randomColor(): string {
  return AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];
}
