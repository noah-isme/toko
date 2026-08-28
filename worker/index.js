/*
 * Push-notification extensions for the @ducanh2912/next-pwa generated worker.
 *
 * @ducanh2912/next-pwa imports this file into /pwa-sw.js during production builds. Keep
 * this worker focused on push events; Workbox owns precaching and offline
 * navigation, and no API response is cached here.
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192.svg',
      badge: data.badge || '/icon-192.svg',
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

    event.waitUntil(self.registration.showNotification(data.title || 'toko', options));
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || '/';
  if (action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === new URL(url, self.location.origin).toString() && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'push-subscription-sync') {
    event.waitUntil(Promise.resolve());
  }
});
