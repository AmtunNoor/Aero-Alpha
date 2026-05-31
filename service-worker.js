const CACHE = "arabic-v13";

const ASSETS = [
"./",
"./index.html",
"./game.js",
"./manifest.json",
"./assets/images/sky.webp",
"./assets/images/airport.webp",
"./assets/images/runway.webp",
"./assets/images/plane.webp"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener("fetch", e=>{
  e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request)));
});
