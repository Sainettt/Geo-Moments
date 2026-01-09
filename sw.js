const CACHE_NAME = 'geo-moments-v10'
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
]

// 1. Install Event: Cache static data
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all: app shell')
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
})

// 2. Activate Event: Clear old cache
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate')
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key)
            return caches.delete(key)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// 3. Fetch Event: Take data from cache if we havent connection
self.addEventListener('fetch', (event) => {
  // Cache First, falling back to Network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() => {
          //
        })
      )
    })
  )
})
