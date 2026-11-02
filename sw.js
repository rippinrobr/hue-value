// Value Mix service worker: keeps the app working offline in the studio.
// Bump VERSION when the list of cached files changes.
const VERSION = 'value-mix-v13';
const CORE = [
  './',
  './index.html',
  './paints.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  // Bypass the browser's HTTP cache so a new install never saves a stale copy.
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache-first, so typography works offline after the first visit.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(VERSION).then(async cache => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
          return res;
        } catch (e) {
          return new Response('', { status: 504 });
        }
      })
    );
    return;
  }

  // The app's own files: always try the network first so updates show up on the next launch.
  // The cached copy is only used when there is no connection (or the request times out).
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(VERSION).then(async cache => {
        try {
          const res = await Promise.race([
            fetch(req, { cache: 'no-cache' }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
          ]);
          if (res.ok) { cache.put(req, res.clone()); return res; }
          const hit = await cache.match(req, { ignoreSearch: true });
          return hit || res;
        } catch (e) {
          return (await cache.match(req, { ignoreSearch: true })) ||
                 (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
        }
      })
    );
  }
});
