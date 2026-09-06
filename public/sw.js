const CACHE_NAME = 'bigbazar-cache-v2';
const API_CACHE_NAME = 'bigbazar-api-v2';
const IMG_CACHE_NAME = 'bigbazar-img-v2';

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

  // 0. Admin requests — always network-only, NEVER cache!
  //    Admin panel requires 100% fresh live data; caching causes action delay.
  const referer = request.referrer || '';
  if (
    request.headers.has('Authorization') || 
    referer.includes('/admin') || 
    url.pathname.includes('/admin') ||
    url.searchParams.has('_admin') ||
    url.searchParams.has('_t')
  ) {
    return;
  }

  // 1. Dynamic Product Images (/api/img/*): Stale-While-Revalidate so updated photos reflect quickly
  if (url.pathname.startsWith('/api/img/')) {
    event.respondWith(
      caches.open(IMG_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const networkFetch = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        if (cachedResponse) return cachedResponse;
        const netRes = await networkFetch;
        return netRes || new Response('Image unavailable', { status: 404 });
      })
    );
    return;
  }

  // 1b. Static images (assets / icons): Cache First + Network Fallback
  if (/\.(webp|jpg|jpeg|png|svg|gif|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(IMG_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
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

// Browser push — show system notification
self.addEventListener('push', (event) => {
  let data = { title: 'Big Bazar', body: 'নতুন আপডেট আছে', url: '/' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (_) {
    try {
      data.body = event.data?.text() || data.body;
    } catch (__) {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Big Bazar', {
      body: data.body || '',
      icon: '/b.jpg',
      badge: '/b.jpg',
      data: { url: data.url || (data.product_id ? `/product/${data.product_id}` : '/') },
      vibrate: [120, 60, 120],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || '/';
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })()
  );
});
