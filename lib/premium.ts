// Freemium rules, in ONE place so the client and the server can never disagree about who is premium.
//
// Every new account gets a 7-day trial (written at signup — see createAccount / loginOrCreateWithSocial).
// A second, permanent way in: bring 2 people onto the app with your referral link before the deadline
// and premium never expires. The trial is the default path; the referral is the one we actually want,
// because it is the only one that grows the app.

/** Launch offer: referrals only count toward lifetime access up to this instant. */
export const LIFETIME_DEADLINE = new Date("2026-08-10T23:59:59+02:00");
/** How many signups through your link unlock lifetime access. */
export const REFERRALS_FOR_LIFETIME = 2;
/** Length of the welcome trial, in days. Must match the interval used at signup. */
export const TRIAL_DAYS = 7;

export type PremiumState = {
  premiumUntil?: string | null; // ISO; null = never had a trial
  lifetimeFree?: boolean;
  referralCount?: number;
};

/** Locked behind premium. Everything else stays free forever, on purpose: an app you can't use is an app you delete. */
export const PREMIUM_FEATURES = {
  shoppingList: "la liste de courses",
  recipes: "les recettes",
  cooking: "le mode cuisine",
} as const;

export function isPremium(m: PremiumState | null | undefined, now: Date = new Date()): boolean {
  if (!m) return false;
  if (m.lifetimeFree) return true;
  if (!m.premiumUntil) return false;
  const until = new Date(m.premiumUntil);
  return Number.isFinite(until.getTime()) && until.getTime() > now.getTime();
}

/** Whole days left in the trial, floor 0. Used for the "il te reste N jours" nudge. */
export function trialDaysLeft(m: PremiumState | null | undefined, now: Date = new Date()): number {
  if (!m?.premiumUntil || m.lifetimeFree) return 0;
  const ms = new Date(m.premiumUntil).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

export function referralsLeft(m: PremiumState | null | undefined): number {
  return Math.max(0, REFERRALS_FOR_LIFETIME - (m?.referralCount ?? 0));
}

export function offerStillOpen(now: Date = new Date()): boolean {
  return now.getTime() <= LIFETIME_DEADLINE.getTime();
}

/** "10 août" — the deadline in the copy, always rendered from the constant so the two can't drift. */
export const DEADLINE_LABEL = LIFETIME_DEADLINE.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/**
 * The App Store listing. EMPTY until the app is published, and that case is handled rather than
 * ignored: /invite falls back to the web app, so a shared link never leads to a dead end. Fill this
 * in the day the listing goes live — it is served from Vercel, so it needs no App Store resubmission.
 */
export const APP_STORE_URL = "";

/**
 * Absolute referral URL for a code. Points at /invite, which banks the code and sends the visitor to
 * the App Store (or the web app while there is no listing).
 */
export function referralUrl(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "https://a-taaaable.vercel.app");
  return `${base}/invite?r=${encodeURIComponent(code)}`;
}
