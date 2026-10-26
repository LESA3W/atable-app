"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { captureReferralFromUrl } from "@/lib/referral";

// A cold launch that lands on "/" (the Repas wizard) bounces once to the calendar, so the app always
// OPENS on the calendar — regardless of a browser hit on "/" or a PWA whose cached start_url is stale
// (iOS caches the manifest at install time, so changing start_url alone isn't reliable).
//
// Fires only on the FIRST mount of the JS session (module flag), and only on a bare "/" without a
// Repas deep-link. So in-app navigation to the "Repas" tab ("/") and the calendar's "Ajouter un repas"
// links ("/?date=&slot=") are left completely alone.
let launched = false;

export function LaunchRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (launched) return;
    launched = true;
    // BEFORE any redirect: a ?r= referral link lands on "/" and the bounce below throws the query
    // string away, so the code has to be banked here or it is lost for good.
    captureReferralFromUrl();
    if (pathname !== "/") return; // launched straight onto another route -> nothing to do
    const q = window.location.search;
    if (q.includes("date=") || q.includes("slot=")) return; // deep-link into Repas -> keep it
    router.replace("/semaine");
  }, [pathname, router]);

  return null;
}

export default LaunchRedirect;
