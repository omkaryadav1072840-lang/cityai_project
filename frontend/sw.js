// SmartCity AI - Service Worker
const CACHE_NAME = "smartcity-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/index.css",
  "/script.js",
  "/ChatGPT_Image_Aug_11__2026__11_27_44_PM-removebg-preview.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Let API requests pass directly to the network
  if (event.request.url.includes("/api/") || event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => caches.match("/index.html"))
      );
    })
  );
});
