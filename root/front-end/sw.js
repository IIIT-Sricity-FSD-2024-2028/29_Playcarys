// PlayCarys PWA Service Worker
// Bump this on every release. `activate` deletes any cache whose name differs,
// so the version string is the ONLY thing that evicts stale entries — leaving it
// at v1 forever meant a browser kept serving whatever it cached the first time.
const CACHE_NAME = 'playcarys-cache-v3';

// Shell only. `data/db.js` and `js/utils.js` used to be precached here, and that
// is application LOGIC, not an offline asset: a browser that had them kept
// running last week's code against this week's API. Symptom seen in the wild —
// a fix to the boot hydrate shipped, the browser kept the old file, the old file
// failed CORS, the client silently fell back to its stale localStorage and then
// pushed that back over the server on the next save. Deleted rows came back and
// admin edits reverted, with nothing in the UI to suggest why.
//
// They are served normally now, so a refresh always gets the current code.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/variables.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      // A shell file that 404s must not abort the install. It used to: addAll
      // rejects as a unit, the worker never reached `activate`, and the old
      // version stayed in control — so a release could not replace a broken one.
      .catch((err) => console.warn('[PlayCarys SW] Precache incomplete:', err))
  );
  // Take over on the next load rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only same-origin GETs belong to this cache.
  //
  // Everything used to go through here, including POSTs to the API on :3000.
  // Those can never be served from a Cache (the Cache API rejects non-GET), so
  // wrapping them achieved nothing except putting a failure path in front of
  // every database write.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).catch((networkErr) => {
      // Offline: fall back to the cache, ignoring query strings like ?v=6.
      return caches.match(req, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;

        // Nothing cached either.
        //
        // This used to `return undefined`, which rejects respondWith and hands
        // the page a bare net::ERR_FAILED — for a <script>, that silently
        // produces a half-loaded page with no clue why. Worse, it converted a
        // momentary blip into a hard failure of assets that were served
        // perfectly well a second later. Re-throwing lets the browser report
        // the real network error, and behave exactly as it would with no
        // service worker installed at all.
        throw networkErr;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      // Control pages that are already open, so a fixed worker takes effect on
      // this load instead of the one after it.
      .then(() => self.clients.claim())
  );
});
