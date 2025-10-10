const CACHE_NAME = "vrl-media-cache-v2";
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => self.clients.claim());

// Cache fetched media files
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  const isMedia = /\.(mp4|webm|jpg|jpeg|png|gif|mp3)$/i.test(url);
  if (!isMedia) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => cached || Response.error());
    })
  );
});
