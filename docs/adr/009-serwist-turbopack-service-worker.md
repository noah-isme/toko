# ADR 009: Serwist Service Worker on Turbopack

## Status

Accepted (supersedes [ADR-008](008-pwa-offline-strategy.md))

## Context

ADR-008 used `@ducanh2912/next-pwa`, a webpack plugin. It forced `next build --webpack`, blocking the Turbopack build (ROADMAP M5), and it left the storefront with two workers: the generated `/pwa-sw.js` for caching and a hand-written `/sw.js` for push. The legacy `/sw.js` also cached `/api/` responses, contradicting ADR-008's "no API caching" rule, and it was registered in development, where it competed with MSW's `mockServiceWorker.js`.

`@serwist/turbopack` builds the worker with esbuild inside a Next.js route handler, so it works with Turbopack and needs no bundler plugin. The Next.js 16 PWA guide points to it as the Turbopack option.

## Decision

- **One worker**, `src/app/sw.ts`, bundled by `createSerwistRoute` in `src/app/serwist/[path]/route.ts` (native `esbuild`) and served at `/serwist/sw.js` with `Service-Worker-Allowed: /` and `Cache-Control: no-cache, no-store, must-revalidate`. Push handlers live in `src/app/sw-push.ts` and are part of the same worker.
- **Precache**: the build manifest (`.next/static`, `public/` minus `mockServiceWorker.js`) plus `/offline`, revisioned by the commit SHA.
- **Runtime caching**: Google Fonts and gstatic (CacheFirst, 4 entries, 1 year) and images (CacheFirst, 100 entries, 30 days, never same-origin `/api/`). Serwist's `defaultCache` is deliberately not used.
- **No API or document caching**: navigations go to the network (`NetworkOnly`); when that fails the precached `/offline` page is served. `SerwistProvider` runs with `cacheOnNavigation={false}` so visited pages are not cached either.
- **Updates**: `skipWaiting` + `clientsClaim`. On `activate` the worker deletes caches prefixed `workbox-` or `toko-push-` left by the next-pwa worker.
- **Registration**: `SerwistProvider` (`src/components/providers/serwist-provider.tsx`) mounted in the root layout only when `NODE_ENV === 'production'` or `NEXT_PUBLIC_SW_DEV === 'true'`, with `reloadOnOnline={false}` so reconnecting does not wipe checkout form state.
- **Push**: `src/entities/web-push/registration.ts` resolves the active registration or rejects after a timeout, so subscribing in development (no worker) fails with a clear message instead of hanging on `navigator.serviceWorker.ready`.
- **Build tooling**: `pnpm build` uses Turbopack; `pnpm analyze` runs `next experimental-analyze --output` (writes `.next/diagnostics/analyze`). `@next/bundle-analyzer`, `webpack` and `babel-loader` were removed.
- **Type checking**: the worker files are excluded from `tsconfig.json` and checked by `tsconfig.worker.json` (`lib: ["ESNext", "WebWorker"]`); ESLint applies `globals.serviceworker` to them.

## Consequences

- **Positive:** Turbopack builds in production. One worker owns caching, offline and push.
- **Positive:** The ADR-008 "no API caching" invariant now actually holds.
- **Positive:** Development no longer registers a worker by default, so MSW owns the scope.
- **Negative:** `pnpm e2e` runs on `pnpm dev` and never exercises the production worker. `pnpm e2e:prod` (`playwright.prod.config.ts`: `build:mock` + `start:mock`, service workers allowed) covers the worker script and registration. The offline fallback and DevTools push test remain manual Chrome checks.
- **Negative:** The worker is bundled at build time by a route handler, so `esbuild` must be allowed to run its install script (`pnpm.onlyBuiltDependencies`).
- **Migration:** Installed clients still have `pwa-sw.js` registered at scope `/`. The new worker registers at the same scope and replaces it; old Workbox caches are removed on activation.
