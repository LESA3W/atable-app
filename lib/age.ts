// Whole-years age from an ISO date-of-birth ("YYYY-MM-DD"). Computed at read time
// so it stays correct after each birthday, with no stored age to go stale.
export function computeAge(birthdate: string | null | undefined, today = new Date()): number | null {
  if (!birthdate) return null;
  const b = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
