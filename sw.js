// Permite usar la biblioteca sin conexión una vez visitada (GitHub Pages o cualquier servidor).
// Estrategia: red primero y, si no hay conexión, la última copia guardada.
const CACHE = 'catecismos-v10';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/estilos.css', 'assets/app.js', 'assets/icono.svg', 'assets/icono-192.png', 'assets/icono-512.png',
  'data/catalogo.json', 'data/catecismo-menor.json', 'data/catecismo-menor-pendientes.json', 'data/catecismo-mayor-westminster.json', 'data/catecismo-heidelberg.json', 'data/biblioteca-embebida.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k.startsWith('catecismos-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
