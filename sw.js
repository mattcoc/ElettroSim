/* ElettroSim · service worker: tiene una copia dell'app sul dispositivo, così si apre anche senza connessione.
   Online prende sempre la versione più recente dalla rete (e aggiorna la copia), offline usa la copia salvata.
   Quando aggiungi un file all'app, aggiungilo anche a ASSETS e aumenta VERSION. */
const VERSION = 'v2';
const CACHE = 'elettrosim-' + VERSION;
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'css/fonts.css', 'css/app.css',
  'js/version.js', 'js/config.js', 'js/util.js', 'js/symbols.js', 'js/model.js', 'js/render.js', 'js/history.js', 'js/sim.js',
  'js/editor.js', 'js/ui.js', 'js/panels.js', 'js/files.js', 'js/coop.js', 'js/examples.js', 'js/settings.js', 'js/main.js',
  'fonts/ibm-plex-sans-latin-400-normal.woff2', 'fonts/ibm-plex-sans-latin-500-normal.woff2', 'fonts/ibm-plex-sans-latin-600-normal.woff2',
  'fonts/ibm-plex-sans-condensed-latin-400-normal.woff2', 'fonts/ibm-plex-sans-condensed-latin-500-normal.woff2', 'fonts/ibm-plex-sans-condensed-latin-600-normal.woff2',
  'fonts/ibm-plex-mono-latin-400-normal.woff2', 'fonts/ibm-plex-mono-latin-500-normal.woff2',
  'vendor/jspdf.umd.min.js', 'vendor/firebase/firebase-app.js', 'vendor/firebase/firebase-auth.js', 'vendor/firebase/firebase-firestore.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(a => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('elettrosim-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([fetch(req), timeout(5000)]);
      if (res.ok && res.type === 'basic') cache.put(req.mode === 'navigate' ? 'index.html' : req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('index.html') : null);
      if (hit) return hit;
      throw err;
    }
  })());
});
