/* Rastero service worker: offline after first use. The build fills in VERSION and SHELL (scope-relative). */
const VERSION = '__VERSION__'
/** Path the app is served under (e.g. '/rastero/' on GitHub Pages); other sites on the origin are left alone. */
const BASE = new URL(self.registration.scope).pathname
const SHELL = __SHELL__
const SHELL_CACHE = `rastero-shell-${VERSION}`
const ASSET_CACHE = `rastero-assets-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('rastero-') && k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return

  // Pages: always try the network for a fresh deploy, fall back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(BASE, copy))
          return response
        })
        .catch(() => caches.match(BASE, { cacheName: SHELL_CACHE })),
    )
    return
  }

  // Hashed build files and samples never change under the same URL: cache on first use (codecs included).
  if (url.pathname.startsWith(`${BASE}assets/`) || url.pathname.startsWith(`${BASE}samples/`)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = (await cache.match(request)) ?? (await caches.match(request, { cacheName: SHELL_CACHE }))
        if (hit) return hit
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
  }
})
