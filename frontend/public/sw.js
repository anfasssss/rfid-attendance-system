const CACHE_NAME = 'brahmagupta-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/background.png',
  '/auth_background.png',
  '/avatar.jpg',
  '/icon-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Skip non-GET requests or browser extension requests
  if (e.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Cache-first strategy for static assets (images, fonts, stylesheets)
  if (
    e.request.destination === 'image' ||
    e.request.destination === 'font' ||
    e.request.destination === 'style' ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cacheCopy));
          }
          return networkResponse;
        }).catch(() => new Response('Asset not available offline', { status: 503 }));
      })
    );
  } else {
    // Network-first with cache fallback for other assets
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cacheCopy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(e.request).then((cachedResponse) => cachedResponse || new Response('Offline', { status: 503 })))
    );
  }
});
