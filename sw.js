"use strict";

/* Cache name. Bump it whenever the cached files change. */
const CACHE = "proudgeon-loading-v13";
const ASSETS = ["./", "./index.html", "./style.css", "./app.js", "./logo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          ASSETS.map((url) => new Request(url, { cache: "reload" })),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("proudgeon-loading-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* Network first, cache as the offline fallback.
   A cache-first strategy kept serving the previous build on the first reload
   after a deployment, so returning visitors saw an outdated screen until a
   second reload. Fetching first means a deploy is picked up on the next load,
   while a failed fetch still falls back to the cached copy for offline use. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      // Query strings (e.g. a shared launch link) must not break offline launches.
      const home = new URL("./", self.location.href);
      const fallback = await cache.match(new URL("index.html", home).href);
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(networkFirst(event.request));
});
