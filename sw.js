"use strict";
const CACHE = "proudgeon-loading-v10";
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
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        return await fetch(event.request);
      } catch (error) {
        // Query strings (e.g. a shared launch link) must not break offline launches.
        const url = new URL(event.request.url);
        const home = new URL("./", self.location.href);
        if (
          event.request.mode === "navigate" &&
          (url.pathname === home.pathname ||
            url.pathname === `${home.pathname}index.html`)
        ) {
          const fallback = await cache.match(new URL("index.html", home).href);
          if (fallback) return fallback;
        }
        throw error;
      }
    }),
  );
});
