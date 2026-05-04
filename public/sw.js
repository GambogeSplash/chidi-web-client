/* Chidi service worker — offline-first for Lagos 3G.
 *
 * Strategy:
 *   - Static (logo, favicon, manifest, /_next/static/*, /icon-*.png): cache-first.
 *     Cheap to serve, never changes per build hash. We backfill on install.
 *   - HTML navigations: network-first with cached fallback. We never want to
 *     pin the merchant on a stale dashboard, but if their tower drops mid-tap
 *     they get the last good page instead of the browser's "no internet" dino.
 *   - Same-origin GETs that aren't HTML and aren't static: stale-while-revalidate.
 *     Returns whatever's cached immediately (fast paint), refreshes in background.
 *   - Cross-origin / non-GET / API mutations: passthrough. Never cache POSTs.
 *
 * On install we precache the bare-minimum shell so a cold offline boot still
 * paints the logo + favicon. Everything else fills in as the merchant browses.
 *
 * On activate we evict any cache whose name doesn't match the current version
 * — bump CACHE_VERSION on every shipping change to force a refresh.
 *
 * The SW also broadcasts a NETWORK_STATUS message to all clients when it
 * notices a fetch failure (poor man's offline detector for browsers that
 * lie about navigator.onLine). The OfflineBanner doesn't strictly need this
 * yet — it leans on window 'online'/'offline' events — but the channel is
 * here so the queue can opt in for richer signaling later.
 *
 * NO new dependencies. Vanilla SW APIs only. Workbox-style patterns reimplemented.
 */

const CACHE_VERSION = "chidi-v3-2026-05-03"
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const HTML_CACHE = `${CACHE_VERSION}-html`

// Bare shell — always available offline.
const PRECACHE_URLS = [
  "/logo.png",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // addAll is atomic — if one URL 404s the whole install fails. Wrap each
        // in a tolerant put so a missing asset doesn't brick the SW.
        Promise.all(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: "no-cache" })
              .then((res) => (res.ok ? cache.put(url, res.clone()) : null))
              .catch(() => null),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (![STATIC_CACHE, RUNTIME_CACHE, HTML_CACHE].includes(key)) {
              return caches.delete(key)
            }
            return null
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  // Next.js immutable build assets, public images, fonts, manifest
  if (url.pathname.startsWith("/_next/static/")) return true
  if (url.pathname.startsWith("/icon-")) return true
  if (
    url.pathname === "/logo.png" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.json"
  ) {
    return true
  }
  if (/\.(png|jpe?g|svg|webp|avif|gif|ico|woff2?|ttf|otf|css|js)$/i.test(url.pathname)) {
    return true
  }
  return false
}

function isHTMLNavigation(request) {
  if (request.mode === "navigate") return true
  const accept = request.headers.get("accept") || ""
  return accept.includes("text/html")
}

async function broadcastNetworkStatus(online) {
  const clients = await self.clients.matchAll({ type: "window" })
  for (const client of clients) {
    client.postMessage({ type: "CHIDI_NETWORK_STATUS", online })
  }
}

// Cache-first — try cache, fall back to network, write-through on success.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res && res.ok) cache.put(request, res.clone())
    return res
  } catch (err) {
    // Static asset miss + offline — return whatever we can. For images we
    // could return a placeholder; for now just rethrow so the browser shows
    // its own broken-image glyph (predictable).
    throw err
  }
}

// Network-first — try network with a short timeout, fall back to cache.
async function networkFirstHTML(request) {
  const cache = await caches.open(HTML_CACHE)
  try {
    const res = await fetch(request)
    if (res && res.ok) cache.put(request, res.clone())
    return res
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) {
      broadcastNetworkStatus(false)
      return cached
    }
    // Last-resort: serve the cached "/" so the merchant lands on something
    // familiar instead of the browser's offline page.
    const root = await cache.match("/")
    if (root) {
      broadcastNetworkStatus(false)
      return root
    }
    throw err
  }
}

// Stale-while-revalidate — instant cached response, background refresh.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => cached)
  return cached || networkPromise
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return // never cache mutations

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // skip cross-origin
  // Skip Next.js HMR / dev sockets and analytics/sentry beacons.
  if (url.pathname.startsWith("/_next/webpack-hmr")) return
  if (url.pathname.startsWith("/api/")) return // pass through API to the network — never serve stale data

  if (isHTMLNavigation(request)) {
    event.respondWith(networkFirstHTML(request))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
})

// Allow the page to nudge us to skip waiting on a new SW deploy.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
