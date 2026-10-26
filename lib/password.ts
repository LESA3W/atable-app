// Shared email + password rules, used by BOTH the client (signup UI + strength meter) and the server
// (account creation) so the two can never disagree. Pure (no "use client", no imports) so the API
// routes can import it too.

// ---------- email ----------

// Stricter than the old /^[^\s@]+@[^\s@]+\.[^\s@]+$/: a real local part, a domain, and a TLD of at
// least 2 letters — rejects junk like "a@a.a", "x@y", trailing dots, spaces. It still can't prove the
// address is REAL (only a verification email can); it just rejects malformed ones.
export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

export function isValidEmail(raw: string): boolean {
  const e = raw.trim();
  if (e.length < 6 || e.length > 254) return false;
  if (e.includes("..") || e.startsWith(".") || e.includes(".@") || e.includes("@.")) return false;
  return EMAIL_RE.test(e);
}

// ---------- password ----------

// Keyboard rows (AZERTY + QWERTY + digits). A password that is a run along one of these is a
// "keyboard walk" (azerty, azertyuiop, qwerty, qsdfgh, 123456…) — long but trivially guessable.
const KEYBOARD_ROWS = [
  "azertyuiop", "qsdfghjklm", "wxcvbn",
  "qwertyuiop", "asdfghjkl", "zxcvbnm",
  "1234567890", "0987654321",
];
// Common/obvious passwords (FR + universal). Kept lowercase; the check lowercases the input.
const COMMON = new Set([
  "password", "passw0rd", "motdepasse", "azerty", "azertyuiop", "qwerty", "qwertyuiop",
  "123456", "1234567", "12345678", "123456789", "1234567890", "111111", "000000", "121212",
  "azerty123", "motdepasse1", "password1", "abc123", "a1b2c3", "iloveyou", "admin", "root",
  "welcome", "bonjour", "soleil", "doudou", "chouchou", "loulou", "coucou", "football",
  "dragon", "monkey", "letmein", "sunshine", "princess", "marseille", "nicolas", "camille",
]);

function isKeyboardWalk(low: string): boolean {
  if (low.length < 4) return false;
  return KEYBOARD_ROWS.some((row) => row.includes(low) || [...row].reverse().join("").includes(low));
}

// Monotonic run of char codes (abcdef, 654321, qponml) across (almost) the whole password.
function isSequential(s: string): boolean {
  if (s.length < 4) return false;
  let asc = true;
  let desc = true;
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (d !== 1) asc = false;
    if (d !== -1) desc = false;
  }
  return asc || desc;
}

// 0..4, matching the meter labels: 0 Trop court · 1 Faible · 2 Moyen · 3 Fort · 4 Très fort.
export function passwordScore(pw: string): number {
  if (!pw || pw.length < 6) return 0;
  const low = pw.toLowerCase();
  const uniq = new Set(pw).size;
  // Any obvious pattern is capped at "Faible" no matter how long it is.
  const patterned = COMMON.has(low) || isKeyboardWalk(low) || isSequential(low) || uniq <= 3;
  if (patterned) return 1;

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(pw)).length;
  let s = 1;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (classes >= 2) s++;
  if (classes >= 3) s++;
  return Math.min(s, 4);
}

// The gate for creating an account: at least 8 chars AND not a weak/patterned password (score >= 2).
export function isAcceptablePassword(pw: string): boolean {
  return pw.length >= 8 && passwordScore(pw) >= 2;
}
