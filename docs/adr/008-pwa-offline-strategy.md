# ADR 008: PWA and Offline Strategy

## Status

Accepted

## Context

Shoppers in regions with unreliable connectivity need the storefront to degrade gracefully when offline and to load quickly on repeat visits.

## Decision

Implement Progressive Web App capabilities using `next-pwa` (Workbox wrapper):

- **Service worker** (`pwa-sw.js`): auto-registers in production with `skipWaiting` for instant updates
- **Runtime caching**: Google Fonts (CacheFirst, 1 year), images (CacheFirst, 30 days)
- **No API caching**: authenticated/mutable API responses are explicitly excluded from service worker caching to avoid stale data
- **Offline fallback**: `/offline` page with auto-reload on connectivity restoration
- **Push notifications**: separate hand-written worker at `/sw.js` handles push events; `next-pwa` generates `pwa-sw.js` to avoid conflicts
- **Web App Manifest**: installable with `display: standalone`, SVG maskable icons

## Consequences

- **Positive:** Repeat visits load instantly from cache. Installable on mobile home screens.
- **Positive:** Offline fallback provides a clear UX rather than a browser error page.
- **Negative:** next-pwa requires Webpack builds (not Turbopack). Service worker debugging is non-trivial.
- **Negative:** Two service workers (`sw.js` for push, `pwa-sw.js` for caching) add complexity.
