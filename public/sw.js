const CACHE_NAME = 'newsflow-ai-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache opened, adding static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => {
        console.error('❌ Cache install failed:', err);
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control immediately
});

// Fetch event - Network first for API, Cache first for static assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network first strategy for API calls (always get fresh news)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone and cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to return cached version
          console.warn('📡 Network failed, trying cache for:', url.pathname);
          return caches.match(request).then(cached => {
            if (cached) {
              console.log('✅ Serving cached API response');
              return cached;
            }
            // Return offline response if no cache
            return new Response(
              JSON.stringify({
                status: 'error',
                message: 'You are offline. Please check your internet connection.',
                articles: []
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Cache first strategy for static assets (faster loading)
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          // Return cached version immediately, update cache in background
          fetch(request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response);
              });
            }
          }).catch(() => {
            // Ignore background update failures
          });
          return cached;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Cache successful responses
            if (response.ok && request.method === 'GET') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(err => {
            console.error('❌ Fetch failed:', err);
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            throw err;
          });
      })
  );
});

// Handle messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
