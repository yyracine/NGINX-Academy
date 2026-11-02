/* Nginx Academy — service worker : app shell cache-first + fallback offline */
const VERSION = 'v1.5.0';
const CACHE = `nginx-academy-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/md.js',
  './js/nginx-lint.js',
  './js/sandbox.js',
  './js/quiz.js',
  './js/app.js',
  './js/data.js',
  './js/data1.js',
  './js/data1b.js',
  './js/data2.js',
  './js/data3.js',
  './js/data4.js',
  './js/data5.js',
  './js/data6.js',
  './js/data7.js',
  './js/data8.js',
  './js/data9.js',
  './js/data10.js',
  './js/guide.js',
  './js/lexique.js',
  './js/correction.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // pas de proxy sur les ressources externes

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html')); // navigation hors-ligne → app shell
    })
  );
});