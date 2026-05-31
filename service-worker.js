const CACHE = "arabic-flight-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./game.js",
  "./manifest.json"
];

// INSTALL
self.addEventListener("install", e=>{
    e.waitUntil(
        caches.open(CACHE).then(c=>c.addAll(ASSETS))
    );
});

// FETCH
self.addEventListener("fetch", e=>{
    e.respondWith(
        caches.match(e.request).then(r=>r || fetch(e.request))
    );
});