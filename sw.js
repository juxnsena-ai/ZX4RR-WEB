/* =========================================================
   SERVICE WORKER: permite instalar la página como app y usarla sin conexión
   - Archivos propios: primero la red (así se ven las actualizaciones al instante)
     y, si no hay internet, la copia guardada.
   - Librerías externas (Three.js, fuentes, iconos): primero la copia guardada.
   Al cambiar archivos importantes, sube el número de VERSION.
   ========================================================= */
const VERSION = 'zx4rr-v2';
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
// Librerías externas que la app necesita: se guardan desde la primera visita
const THREE = 'https://cdn.jsdelivr.net/npm/three@0.169.0/';
const FA = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/';
const EXTERNAL = [
  THREE + 'build/three.module.js',
  THREE + 'examples/jsm/controls/OrbitControls.js',
  THREE + 'examples/jsm/renderers/CSS2DRenderer.js',
  THREE + 'examples/jsm/environments/RoomEnvironment.js',
  THREE + 'examples/jsm/geometries/RoundedBoxGeometry.js',
  THREE + 'examples/jsm/utils/BufferGeometryUtils.js',
  FA + 'css/all.min.css',
  FA + 'webfonts/fa-solid-900.woff2',
  FA + 'webfonts/fa-regular-400.woff2',
  FA + 'webfonts/fa-brands-400.woff2',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800;900&family=Rajdhani:wght@500;600;700&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(CORE).then(() =>
        // las externas, una a una: si alguna falla, la app se instala igual
        Promise.all(EXTERNAL.map((u) => c.add(new Request(u, { mode: 'cors' })).catch(() => {})))
          .then(() => cacheFontFiles(c))))
      .then(() => self.skipWaiting())
  );
});

// Guarda los archivos de letra (Orbitron y Rajdhani) que cita la hoja de Google Fonts
function cacheFontFiles(c) {
  return c.match(EXTERNAL[EXTERNAL.length - 1])
    .then((res) => (res ? res.text() : ''))
    .then((css) => {
      const urls = (css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"]+/g) || []);
      return Promise.all(urls.map((u) => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    })
    .catch(() => {});
}

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
