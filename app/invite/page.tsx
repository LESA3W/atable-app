"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_STORE_URL } from "@/lib/premium";
import { captureReferralFromUrl } from "@/lib/referral";

/**
 * A shared referral link lands here and goes straight on to the App Store — no interstitial, the
 * point of the link is to get the app installed.
 *
 * The code is banked BEFORE navigating (the redirect drops the query string), but note it cannot
 * survive the install: Safari's storage and the app's webview are separate containers. That is what
 * the code screen on first launch is for — the link and the typed code are two paths to the same
 * place, and only the second one crosses the App Store.
 *
 * Android and desktop have no listing to go to, so they continue into the web app, where the banked
 * code DOES apply. Same fallback while APP_STORE_URL is still empty.
 */
export default function InvitePage() {
  const router = useRouter();

  useEffect(() => {
    captureReferralFromUrl();
    const ua = navigator.userAgent;
    // iPadOS 13+ reports itself as a Mac; the touch-point check is what catches it.
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (APP_STORE_URL && isIOS) window.location.replace(APP_STORE_URL);
    else router.replace("/");
  }, [router]);

  // Same orange field as everything it can hand off to, so the redirect never flashes.
  return <div className="fixed inset-0 z-[95] bg-[var(--primary)]" aria-hidden />;
}
