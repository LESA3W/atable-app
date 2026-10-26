"use client";

import { useEffect } from "react";

// Registers the app-shell service worker once, after load. No-op without HTTPS
// (or localhost) or service-worker support.
export function RegisterSW() {
  useEffect(() => {
    // Only run the service worker in production (in dev it serves stale assets).
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* best effort */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // Kill the iOS long-press callout / selection magnifier (loupe) app-wide, except in
  // real inputs (which need it to place the cursor). CSS user-select:none alone does NOT
  // stop the tap-then-long-press gesture on iOS, so we cancel the two events it fires:
  // `selectstart` (what actually spawns the loupe as a selection begins) and `contextmenu`
  // (the callout). Preventing selectstart on non-inputs is the real fix.
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      return !!n && (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.isContentEditable);
    };
    const guard = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault();
    };
    document.addEventListener("selectstart", guard);
    document.addEventListener("contextmenu", guard);
    return () => {
      document.removeEventListener("selectstart", guard);
      document.removeEventListener("contextmenu", guard);
    };
  }, []);

  return null;
}
