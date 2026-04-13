/* global self, caches, clients */
/**
 * Cache bust: bump when changing caching rules so clients drop old entries.
 * v2: /_next/static uses network-first (v1 cache-first caused stale JS chunks →
 * "module factory is not available" after dev rebuilds / lucide splits).
 */
const CACHE_NAME = 'poultryos-static-v2'

const STATIC_ASSETS = ['/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  // Next.js hashed chunks: always prefer network so HMR / rebuilds never load stale modules.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached
            return new Response('', { status: 503, statusText: 'Offline' })
          })
        )
    )
    return
  }

  if (url.pathname === '/manifest.json' || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            }
            return response
          })
          .catch(() => new Response('', { status: 503, statusText: 'Offline' }))
      })
    )
  }
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'poultryos-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_REQUEST' })
        })
      })
    )
  }
})
