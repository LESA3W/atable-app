const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
export function ymdOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// Monday of the week `offsetWeeks` away from `base` (0 = base's own week), as a local Date.
export function mondayOf(offsetWeeks: number, base: Date = new Date()): Date {
  const diffToMon = (base.getDay() + 6) % 7; // 0=Sun..6=Sat -> days since Monday
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() - diffToMon + offsetWeeks * 7);
}
// Whole-week offset of a YYYY-MM-DD date relative to base's week (0 = same week, 1 = next week…).
export function weekOffsetOfDate(dateYmd: string, base: Date = new Date()): number {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const baseMon = mondayOf(0, base).getTime();
  const targetMon = mondayOf(0, new Date(y, m - 1, d)).getTime();
  return Math.round((targetMon - baseMon) / (7 * 24 * 3600 * 1000));
}
// Given the dates that have planned meals, the nearest week (from this week onward, up to
// `maxWeeks`) that has any meal — so the shopping list/cart follow where the food actually is
// instead of staying stuck on an empty current week. 0 when nothing is planned ahead.
export function nearestPlannedWeekOffset(mealDates: string[], base: Date = new Date(), maxWeeks = 4): number {
  const has = new Set(mealDates.map((d) => weekOffsetOfDate(d, base)).filter((o) => o >= 0 && o <= maxWeeks));
  for (let o = 0; o <= maxWeeks; o++) if (has.has(o)) return o;
  return 0;
}

// "4-10 juillet" when the week stays in one month, "30 juin - 6 juillet" when it straddles two.
// Inputs are YYYY-MM-DD (parsed by hand to stay timezone-safe).
export function weekRangeLabel(startYmd: string, endYmd: string): string {
  const [, sMo, sDa] = startYmd.split("-").map(Number);
  const [, eMo, eDa] = endYmd.split("-").map(Number);
  if (sMo === eMo) return `${sDa}-${eDa} ${MONTHS[sMo - 1]}`;
  return `${sDa} ${MONTHS[sMo - 1]} - ${eDa} ${MONTHS[eMo - 1]}`;
}
