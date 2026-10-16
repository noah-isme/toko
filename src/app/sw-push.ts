/// <reference lib="webworker" />
/*
 * Push-notification handlers for the Serwist service worker (src/app/sw.ts).
 *
 * Kept separate so the caching setup and the push contract
 * (docs/contracts/push.md) can change independently. No API response is
 * cached here (ADR-009).
 */

declare const self: ServiceWorkerGlobalScope;

type PushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown> & { url?: string };
  actions?: { action: string; title: string; icon?: string }[];
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
  vibrate?: number[];
};

// `image`, `actions`, `renotify`, `vibrate` and `timestamp` are supported by
// Chromium but missing from TypeScript's NotificationOptions.
type ExtendedNotificationOptions = NotificationOptions & {
  image?: string;
  actions?: PushPayload['actions'];
  renotify?: boolean;
  vibrate?: number[];
  timestamp?: number;
};

export function registerPushHandlers(): void {
  self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
      const data = event.data.json() as PushPayload;
      const options: ExtendedNotificationOptions = {
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
    const url: string = event.notification.data?.url || '/';
    if (action === 'dismiss') return;

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        const target = new URL(url, self.location.origin).toString();
        for (const client of clientList) {
          if (client.url === target && 'focus' in client) {
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
}
