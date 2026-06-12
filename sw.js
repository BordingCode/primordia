// sw.js — offline cache.
// Strategy: navigations = network-first (fresh deploys win), assets = stale-while-revalidate
// (instant + self-updating). This avoids the "GitHub Pages stuck on old version" trap.
const CACHE = 'primordia-v6';
const ASSETS = [
  './',
  './index.html',
  './css/style.css?v=2',
  './manifest.json',
  './assets/icon.svg',
  './assets/icon-maskable.svg',
  './js/main.js?v=3',
  './js/engine/rng.js',
  './js/engine/save.js',
  './js/engine/audio.js',
  './js/engine/input.js',
  './js/engine/loop.js',
  './js/render/gl.js',
  './js/render/molecules.js',
  './js/data/elements.js',
  './js/data/recipes.js',
  './js/data/synthesis.js',
  './js/scenes/forge.js',
  './js/scenes/bench.js',
  './js/scenes/lab.js',
  './js/scenes/cell.js',
  './js/scenes/world.js',
  './js/ui/hud.js',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin !== location.origin) return; // let fonts hit network directly

  // Navigations + JS modules: network-first so a new deploy is picked up on the first reload.
  if (req.mode === 'navigate' || url.pathname.endsWith('.js')) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(req).then(h => h || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // Other assets (css/img/fonts): stale-while-revalidate — serve cache fast, refresh in background.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
