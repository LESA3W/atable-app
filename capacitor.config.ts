import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS shell for "À table". The app itself is a server-rendered Next.js site on Vercel, so the
// shell does NOT bundle a static build — it loads the live site in a native WebView via server.url.
// `webDir` (mobile-shell/) is only a tiny offline fallback shown before the remote URL takes over.
// Native value (Haptics, Push, StatusBar, SplashScreen) is layered on in step 2b so Apple does not
// reject this as "just a repackaged website" (Guideline 4.2).
const config: CapacitorConfig = {
  appId: "com.weasel.atable",
  appName: "À table",
  webDir: "mobile-shell",
  server: {
    url: "https://a-taaaable.vercel.app/semaine",
    cleartext: false,
  },
};

export default config;
