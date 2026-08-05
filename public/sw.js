// Service Worker for Web Push Notifications
// This file is served from the public folder

const CACHE_NAME = 'toko-push-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push event - show notification
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      image: data.image,
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction ?? false,
      silent: data.silent ?? false,
      tag: data.tag,
      renotify: data.renotify ?? false,
      vibrate: data.vibrate || [200, 100, 200],
      timestamp: Date.now(),
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Notification click event - handle actions and navigation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, data } = event.notification;
  const url = data?.url || '/';

  if (action) {
    // Handle specific action buttons
    if (action === 'view' || action === 'open') {
      event.waitUntil(clients.openWindow(url));
    } else if (action === 'dismiss') {
      // Just close the notification
      return;
    }
  } else {
    // Default click behavior - open the URL
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(url);
      })
    );
  }
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  // Optional: track notification dismissal
  console.log('Notification closed:', event.notification.tag);
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'push-subscription-sync') {
    event.waitUntil(syncPushSubscription());
  }
});

async function syncPushSubscription() {
  // Implement subscription sync logic if needed
  console.log('Syncing push subscription...');
}

// Fetch event - network first strategy for API, cache first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Network first for API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching if needed
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

