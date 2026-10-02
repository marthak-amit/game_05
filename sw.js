const CACHE = 'sling-sprite-v1';
const FILES = ['./', './index.html', './style.css', './manifest.json', './icon.svg',
  './js/data.js', './js/save.js', './js/audio.js', './js/monet.js', './js/game.js', './js/ui.js', './js/main.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
