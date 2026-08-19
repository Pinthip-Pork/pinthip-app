const CACHE_NAME = 'pinthip-cache-v20260819-4';
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './firebase-messaging-sw.js'
];

// Pre-cache the app shell on install so the first load after SW activation is instant.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    )).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate helper: respond immediately from cache while refreshing in
// the background — keeps navigation fast and offline-capable without waiting on the
// network for every request.
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) => {
    return cache.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached);
      // Return cached copy immediately (if any), otherwise wait for the network.
      return cached || fetchPromise;
    });
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: network-first so users get the latest HTML, fall back to cache offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // JS/CSS: network-first so code updates (versioned ?v= query strings) land promptly,
  // but fall back to cache when offline.
  const networkFirstTypes = ['script', 'style'];
  if (networkFirstTypes.includes(request.destination)) {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (images, fonts, manifest): stale-while-revalidate for instant loads.
  const safeStaticTypes = ['image', 'font', 'manifest'];
  const isAppAsset = safeStaticTypes.includes(request.destination) || request.url.includes('.png') || request.url.includes('.json');

  if (isAppAsset) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ===== FCM Background Push Notifications =====
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { notification: { title: 'ปิ่นทิพย์', body: event.data ? event.data.text() : '' } };
  }
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'ปิ่นทิพย์ เช็กอิน';
  const options = {
    body: notification.body || data.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'pinthip-notification',
    data: { url: data.url || './' },
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
