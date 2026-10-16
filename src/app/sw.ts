/// <reference lib="webworker" />
/*
 * Toko service worker (ADR-009). Bundled by @serwist/turbopack through the
 * route handler at src/app/serwist/[path]/route.ts and served at
 * /serwist/sw.js. Registered only in production, or in development when
 * NEXT_PUBLIC_SW_DEV=true (see src/app/layout.tsx).
 *
 * Invariant: API responses are never cached. Only the build precache, Google
 * Fonts and images use caches; documents go to the network and fall back to the
 * precached /offline page when the network fails.
 */
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

import { registerPushHandlers } from './sw-push';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;
const MONTH_IN_SECONDS = 30 * 24 * 60 * 60;

// Caches left behind by the previous Workbox-based worker (ADR-008).
const LEGACY_CACHE_PREFIXES = ['workbox-', 'toko-push-'];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: 'google-fonts',
        plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: YEAR_IN_SECONDS })],
      }),
    },
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: 'google-fonts-static',
        plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: YEAR_IN_SECONDS })],
      }),
    },
    {
      matcher: ({ url, sameOrigin }) =>
        !(sameOrigin && url.pathname.startsWith('/api/')) &&
        /\.(?:png|jpg|jpeg|svg|webp|avif|gif)$/i.test(url.pathname),
      handler: new CacheFirst({
        cacheName: 'images',
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: MONTH_IN_SECONDS })],
      }),
    },
    {
      // Documents are never cached; this route exists so the /offline
      // fallback below has a strategy to attach to.
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

registerPushHandlers();

serwist.addEventListeners();
