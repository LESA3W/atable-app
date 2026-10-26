// Accent-, ligature- and punctuation-insensitive search shared by every list/filter
// in the app. "puree" matches "Puree"/"Purée", "creme fraiche" matches "Crème fraîche",
// "oeuf" matches "Œufs", "soupe legume" matches "Soupe de légumes" (each typed word
// must appear somewhere, order-independent).

const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalize(s: string): string {
  return s
    .normalize("NFD") // split accented letters into base + combining mark
    .replace(COMBINING_MARKS, "") // drop combining marks (é -> e, ç -> c)
    .toLowerCase()
    .replace(/œ/g, "oe") // œ -> oe
    .replace(/æ/g, "ae") // æ -> ae
    .replace(/[^a-z0-9]+/g, " ") // punctuation/separators -> single space
    .trim();
}

export function matchesQuery(text: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystack = normalize(text);
  // Every whitespace-separated token must be found somewhere in the text.
  return q.split(" ").every((token) => haystack.includes(token));
}
