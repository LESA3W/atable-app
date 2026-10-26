/* Minimal app-shell service worker for "A table !".
   - Precache the shell for a fast launch + offline fallback.
   - Pages: network-first (fresh content), fall back to cache, then /offline.
   - Static assets (_next, fonts, images): cache-first.
   - API (/api/*): never cached (needs the network). */
const VERSION = "v215";
const CACHE = `a-taaaable-${VERSION}`;
const SHELL = ["/", "/preferences", "/semaine", "/courses", "/notifications", "/historique", "/parametres", "/famille", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(SHELL.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // always hit the network

  // Page navigations: network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match("/offline")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets: cache-first.
  const isStatic =
    url.pathname.startsWith("/_next/") ||
    /\.(?:css|js|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      })(),
    );
  }
});
