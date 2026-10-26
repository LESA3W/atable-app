// The referral code carried by a ?r= link, parked in localStorage.
//
// It has to survive a lot between the tap on someone's link and the account actually being created:
// the LaunchRedirect bounce to /semaine (which drops the query string), the whole onboarding flow,
// and — for social sign-up — a round trip through an OAuth popup. So we read it once, as early as
// possible, and keep it until a signup consumes it.
import { referralUrl } from "@/lib/premium";

const KEY = "atable.referral";

/** Read ?r= out of the current URL and park it. Safe to call on every launch. */
export function captureReferralFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const code = new URLSearchParams(window.location.search).get("r");
    if (!code) return;
    const clean = code.trim().toUpperCase().slice(0, 12);
    if (clean.length < 4) return;
    // First link wins: someone who already has a pending referral shouldn't have it overwritten by
    // a second link they happen to open before signing up.
    if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, clean);
  } catch {
    // private mode / storage disabled — a referral is a nicety, never a blocker
  }
}

/**
 * Bank a code typed by hand. This is the ONLY path that survives an App Store install: the code was
 * stored by Safari, and the app's WKWebView has a completely separate storage container, so nothing
 * carries over on its own. Returns false if the code doesn't look like one.
 */
export function setReferral(raw: string): boolean {
  const clean = raw.trim().toUpperCase().slice(0, 12);
  if (clean.length < 4) return false;
  try {
    localStorage.setItem(KEY, clean);
    return true;
  } catch {
    return false;
  }
}

export function pendingReferral(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const ASKED_KEY = "atable.referral.asked";

/**
 * Whether the "do you have a code?" screen has already been shown. It is a FIRST-LAUNCH question:
 * asking again on every visit would put a toll booth in front of an app someone already uses.
 */
export function referralPromptDone(): boolean {
  if (typeof window === "undefined") return true; // never render it during SSR
  try {
    return !!localStorage.getItem(ASKED_KEY) || !!localStorage.getItem(KEY);
  } catch {
    return true; // storage unavailable -> don't trap the user behind a screen we can't dismiss
  }
}

export function markReferralPromptDone(): void {
  try {
    localStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* nothing to remember it with; the screen simply shows again */
  }
}

/** Called once the account exists — the code has done its job. */
/**
 * Hand the referral link to the OS share sheet, falling back to the clipboard. Returns what actually
 * happened so the caller can label its own button — "cancelled" is the user changing their mind on
 * the sheet, which must not be reported as success OR as an error.
 */
export async function shareReferral(code: string, origin?: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = referralUrl(code, origin);
  const text = "Je gère les repas de la maison avec À table ! Prends ton accès avec mon lien :";
  // Clipboard FIRST. The button says "Lien copié" the moment it is tapped, so that has to be true
  // even when the OS share sheet takes over — and it stays true if the sheet is then dismissed.
  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    // blocked (no permission / insecure context) — the share sheet below may still work
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "À table !", text, url });
      return "copied";
    } catch {
      // Dismissed, or no sheet available: the link is on the clipboard either way.
    }
  }
  return copied ? "copied" : "failed";
}

export function clearReferral(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clean up */
  }
}
