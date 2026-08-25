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

  // 0. Authenticated requests (admin) — always network-only, never cache
  //    Admin needs live data; caching stale admin responses causes visible bugs.
  if (request.headers.has('Authorization')) {
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

  // 2. Read APIs (/api/products, /api/settings, /api/products/subcategory-counts):
  //    Network-First with cache fallback (fixes "always one visit behind" stale-while-revalidate bug).
  //    - Try network with a short timeout (3s); on success update cache and return fresh data.
  //    - On network failure, fall back to cache so the page still works offline.
  //    - If both fail, return a 503 JSON error (prevents respondWith(null) crash).
  if (url.pathname.startsWith('/api/products') || url.pathname.startsWith('/api/settings')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        // Wrap fetch with a 3-second timeout so we don't stall a fast cached fallback
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SW network timeout')), 3000)
        );
        try {
          const networkResponse = await Promise.race([fetch(request), timeoutPromise]);
          if (networkResponse && networkResponse.status === 200) {
            // Update cache with fresh data
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (_) {
          // Network failed or timed out — try cache
          const cachedResponse = await cache.match(request);
          if (cachedResponse) return cachedResponse;
          // Both network and cache failed — return a graceful offline error
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
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

        // Return cached immediately if available, else wait for network
        if (cachedResponse) return cachedResponse;
        const networkResponse = await networkFetch;
        return networkResponse || new Response('Asset unavailable', { status: 503 });
      })
    );
    return;
  }
});
