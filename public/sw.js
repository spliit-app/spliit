/*
 * Spliit service worker.
 *
 * A lightweight, dependency-free service worker that caches static assets to
 * save bandwidth and improve load performance, while always serving fresh data
 * for dynamic/API requests.
 *
 * Caching strategy:
 *  - Immutable, content-hashed assets (/_next/static, /logo, icons, fonts):
 *    cache-first — fetched from the network once, then served from cache.
 *  - Optimized images (/_next/image): stale-while-revalidate.
 *  - Page navigations: network-first with a cached fallback, then the offline
 *    page when both network and cache miss. A redirected page is stored under
 *    its final URL (a navigation cannot use a redirected response), a page
 *    with a query string falls back to the cached page without it, and
 *    /groups/<id> falls back to /groups/<id>/expenses.
 *  - Offline add: the group layout posts WARM_GROUP while online, and the
 *    worker caches that group's expense list and create form plus the
 *    /_next/static files their HTML references, so both open offline later.
 *  - API / tRPC requests and any non-GET request: never cached (always network),
 *    so expense data is never stale.
 *
 * Bump CACHE_VERSION to invalidate all previously cached content on deploy.
 */

const CACHE_VERSION = 'v2'
const PRECACHE = `spliit-precache-${CACHE_VERSION}`
const RUNTIME = `spliit-runtime-${CACHE_VERSION}`
const IMAGE_CACHE = `spliit-images-${CACHE_VERSION}`

const OFFLINE_URL = '/offline.html'

// Minimal app shell precached on install so the app can boot offline.
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/logo-with-text.png',
  '/logo/192x192.png',
  '/logo/512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE)
      // Use `addAll` per-URL so a single missing asset does not abort install.
      await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' }))),
      )
      // Note: we intentionally do NOT call skipWaiting() here. A new worker
      // stays in the "waiting" state until the page explicitly tells it to
      // activate (see the message handler below), which lets the UI prompt the
      // user to reload instead of swapping assets out from under a live page.
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PRECACHE, RUNTIME, IMAGE_CACHE])
      const keys = await caches.keys()
      await Promise.all(
        keys.map((key) => (keep.has(key) ? undefined : caches.delete(key))),
      )
      await self.clients.claim()
    })(),
  )
})

/** Cache-first: serve from cache, falling back to network and storing the result. */
async function cacheFirst(request, cacheName) {
  // Match across all caches (including PRECACHE) so precached assets such as
  // the offline page's logo are served even before they land in `cacheName`.
  const cached = await caches.match(request)
  if (cached) return cached
  const cache = await caches.open(cacheName)
  const response = await fetch(request)
  if (response && response.ok) cache.put(request, response.clone())
  return response
}

/** Stale-while-revalidate: serve cache immediately, refresh in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)
  return cached || (await network) || Response.error()
}

/**
 * A copy of `response` without the `redirected` flag: a navigation refuses a
 * redirected response, so cached pages are stored clean under their final URL.
 */
async function cleanResponse(response) {
  const body = await response.blob()
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

async function cachePage(cache, request, response) {
  const key = response.redirected ? new Request(response.url) : request
  await cache.put(key, await cleanResponse(response))
}

const GROUP_ROOT = /^\/groups\/([^/]+)\/?$/

/** The cached copy of a page, or the closest page that works offline. */
async function cachedPage(cache, request) {
  const url = new URL(request.url)
  const exact = await cache.match(request)
  if (exact) return exact
  // e.g. /expenses/create?reimbursement=yes… → the cached create form, which
  // reads its query string on the client.
  const withoutSearch = await cache.match(request, { ignoreSearch: true })
  if (withoutSearch) return withoutSearch
  const root = url.pathname.match(GROUP_ROOT)
  if (root) return cache.match(`/groups/${root[1]}/expenses`)
  return undefined
}

/** Network-first: try the network, fall back to cache, then the offline page. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response && response.ok)
      cachePage(cache, request, response.clone()).catch(() => {})
    return response
  } catch (err) {
    const cached = await cachedPage(cache, request)
    if (cached) return cached
    const offline = await caches.match(OFFLINE_URL)
    if (offline) return offline
    throw err
  }
}

const STATIC_REF = /\/_next\/static\/[A-Za-z0-9_\-.~%@/]+?\.(?:js|css|woff2?)/g
const WARM_INTERVAL = 10 * 60 * 1000
const lastWarm = new Map()

/** Caches a page and the hashed static files its HTML references. */
async function warmPage(path) {
  const cache = await caches.open(RUNTIME)
  const response = await fetch(path, { credentials: 'same-origin' })
  const type = response.headers.get('content-type') || ''
  if (!response.ok || !type.includes('text/html')) return
  const html = await response.clone().text()
  await cachePage(cache, new Request(path), response)
  const refs = [...new Set(html.match(STATIC_REF) || [])]
  for (const ref of refs) {
    if (await caches.match(ref)) continue
    try {
      const asset = await fetch(ref)
      if (asset.ok) await cache.put(ref, asset)
    } catch {
      // Best effort: a missing chunk only matters offline.
    }
  }
}

/**
 * Caches a group's expense list and create form so an expense can be added
 * offline. At most once per WARM_INTERVAL per group.
 */
async function warmGroup(groupId) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(groupId)) return
  const now = Date.now()
  if (now - (lastWarm.get(groupId) || 0) < WARM_INTERVAL) return
  lastWarm.set(groupId, now)
  for (const path of [
    `/groups/${groupId}/expenses`,
    `/groups/${groupId}/expenses/create`,
  ]) {
    try {
      await warmPage(path)
    } catch {
      lastWarm.delete(groupId)
    }
  }
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/logo/') ||
    /\.(?:js|css|woff2?|ttf|otf|eot|png|svg|ico|webp|gif|jpg|jpeg)$/.test(
      url.pathname,
    )
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests; let everything else hit the network.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Never cache dynamic data — always go to the network.
  if (url.pathname.startsWith('/api/')) return

  // Page navigations: network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, RUNTIME))
    return
  }

  // Optimized images: stale-while-revalidate (URLs vary by query params).
  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE))
    return
  }

  // Immutable static assets: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME))
    return
  }
})

// Allow the page to trigger an immediate activation of a waiting worker.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
  const data = event.data
  if (data && data.type === 'WARM_GROUP' && typeof data.groupId === 'string')
    event.waitUntil(warmGroup(data.groupId))
})
