const STATIC_CACHE_NAME = 'geo-moments-static-v15'; 
const DYNAMIC_CACHE_NAME = 'geo-moments-dynamic-v1'; //dodalem nowy cache dla dynamicznych zasobow
const MAX_DYNAMIC_ITEMS = 50; 

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/main.js',
  './js/db.js',
  './js/ui.js',
  './js/map.js',
  './js/utils.js',
  // jescze dodalem cache dla biblioteki
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];


const limitCacheSize = (name, size) => {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > size) {
        cache.delete(keys[0]).then(limitCacheSize(name, size));
      }
    });
  });
};

// 1. Install: 
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => { return cache.addAll(ASSETS_TO_CACHE); })
  );
});

// 2. Activate: tutaj czyscimy stary cache
self.addEventListener('activate', event => {
  
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) { return caches.delete(key); }
      }));
    })
  );
  return self.clients.claim();
});

// 3. Fetch: zaktualizowana logika fetch
self.addEventListener('fetch', event => {
  const requestURL = new URL(event.request.url);

  // Robimy cache mapy kiedy uzytkownik przesuwa mape
  if (requestURL.href.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(event.request).then(cacheRes => {

        if (cacheRes) return cacheRes;

        return fetch(event.request).then(fetchRes => {
          return caches.open(DYNAMIC_CACHE_NAME).then(cache => {

            cache.put(event.request.url, fetchRes.clone());
            limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_ITEMS);
            return fetchRes;
          });
        });
      }).catch(() => {
        // tutaj automatycznie wstawi sie zdjecie jak nie ma sieci i cache
      })
    );
    return; 
  }

  // Cache wszystkich pozostalych zasobow oprocz mapy
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchRes => {

          return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
             cache.put(event.request.url, fetchRes.clone());
             return fetchRes;
          });
      });
    }).catch(() => {
      // jesli niema ani sieci ani cache zwracamy index
      if (event.request.headers.get('accept').includes('text/html')) {
        return caches.match('./index.html');
      }
    })
  );
});