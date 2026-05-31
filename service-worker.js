const CACHE = "arabic-v16";

const ASSETS = [
"./",
"./index.html",
"./game.js",
"./manifest.json",
"./assets/images/sky_day.webp",
"./assets/images/airport.webp",
"./assets/images/runway.webp",
"./assets/images/plane_trainer.png",
"./assets/sound/engine.mp3",
"./assets/sound/wind.mp3"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener("fetch", e=>{
  e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request)));
});
