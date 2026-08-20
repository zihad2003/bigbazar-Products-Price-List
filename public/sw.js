const CACHE_NAME = 'bigbazar-cache-v1';
const API_CACHE_NAME = 'bigbazar-api-v1';
const IMG_CACHE_NAME = 'bigbazar-img-v1';

// Install event — activate immediately without waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event — clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME && key !== IMG_CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event — smart caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 1. Product Images (/api/img/* or static images): Cache First + Network Fallback
  if (url.pathname.startsWith('/api/img/') || /\.(webp|jpg|jpeg|png|svg|gif|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(IMG_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Serve from cache immediately
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse || new Response('Image unavailable', { status: 404 });
        }
      })
    );
    return;
  }

  // 2. Read APIs (/api/products, /api/settings, /api/products/subcategory-counts): Stale-While-Revalidate
  if (url.pathname.startsWith('/api/products') || url.pathname.startsWith('/api/settings')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        // Fetch fresh copy in background to update cache
        const networkFetch = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        // Return cached data immediately if available (0ms load), otherwise wait for network
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // 3. Static JS/CSS assets: Stale-While-Revalidate
  if (/\.(js|css|woff2|woff|ttf)$/i.test(url.pathname) || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const networkFetch = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }
});
