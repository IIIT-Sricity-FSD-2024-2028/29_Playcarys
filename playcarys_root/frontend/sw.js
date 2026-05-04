// PlayCarys PWA Service Worker
const CACHE_NAME = 'playcarys-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/data/db.js',
  '/js/utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PlayCarys SW] Opened cache');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // If network fails, fallback to cache, ignoring query strings like ?v=6
      return caches.match(event.request, { ignoreSearch: true }).then((response) => {
        if (response) {
          return response;
        }
        console.log('[PlayCarys SW] Offline fallback failed');
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
