/* =========================================================
   SERVICE WORKER: permite instalar la página como app y usarla sin conexión
   - Archivos propios: primero la red (así se ven las actualizaciones al instante)
     y, si no hay internet, la copia guardada.
   - Librerías externas (Three.js, fuentes, iconos): primero la copia guardada.
   Al cambiar archivos importantes, sube el número de VERSION.
   ========================================================= */
const VERSION = 'zx4rr-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/data.js',
  './js/sim.js',
  './js/audio.js',
  './js/bike.js',
  './js/viewer.js',
  './js/ui-inicio.js',
  './js/ui-despiece.js',
  './js/ui-cockpit.js',
  './js/ui-config.js',
  './js/ui-compare.js',
  './js/ui-quote.js',
  './js/ui-specs.js',
  './js/install.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const CDN = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  if (CDN.indexOf(url.hostname) >= 0) {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
