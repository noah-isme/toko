# Implementation Status — Toko Storefront

> Last updated: 2026-10-12
>
> This is the single living status document. It replaces `STATUS_IMPLEMENTASI.md`,
> `P0`–`P3_IMPLEMENTATION_STATUS.md`, the completed lists in `BACKLOG_AKTIF.md` and
> `DOCUMENTATION_GAP_REPORT_2026-08-07.md`, which are kept unchanged in
> [docs/archive/](archive/README.md). Planned work lives in [ROADMAP.md](../ROADMAP.md);
> decisions live in [docs/adr/](adr/README.md).

## Summary

| Area                           | Status                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Storefront features (P0–P3)    | Done — all 41 UX audit items closed (2026-08-07)                               |
| Admin dashboard                | Done — CRUD, orders, campaigns, operations; loading/error states on every page |
| API integration                | Done — typed REST client, OpenAPI codegen with CI drift check                  |
| Module structure (ADR-007)     | Done — all data hooks live in `src/entities/*`; no hooks under `src/lib/api/`  |
| Mock API                       | Done — shared resolvers and seeded fixtures for MSW, the route and SSR         |
| Error boundaries               | Done — global, segment and not-found boundaries                                |
| Server Components              | Done — product list and detail prefetch on the server and hydrate React Query  |
| PWA / service worker (ADR-009) | Done — Serwist on Turbopack; manual Chrome checks pending                      |
| i18n (ADR-010)                 | Done — `id` (default) and `en`, storefront and admin, locale-aware formatting  |
| Testing                        | Vitest with enforced coverage thresholds; Playwright incl. admin flows         |
| Lighthouse CI                  | Job in place; "two consecutive green CI runs" check pending (manual)           |

## Architecture and data flow

- **Framework:** Next.js 16 App Router, built with **Turbopack** (`pnpm build`, no `--webpack`).
  Bundle analysis uses `pnpm analyze` (`next experimental-analyze`).
- **HTTP client:** `apiClient` (native `fetch`) with JWT refresh via http-only cookies and CSRF
  handling (`src/lib/api/apiClient.ts`). Server Components use `serverApiGet`
  (`src/lib/api/server.ts`, `server-only`): absolute URL plus `X-Tenant-ID` and `cache: 'no-store'`
  against a real API, or the in-process mock resolvers in mock mode.
- **State:** TanStack Query v5 for server state, Zustand for client state (cart id, favorites,
  compare, search history, saved-for-later).
- **Types:** `src/lib/api/generated/schema.d.ts` is generated from `openapi.yaml`;
  `pnpm api:check` fails CI on drift and `src/lib/api/generated/conformance.ts` asserts that the
  hand-written client types still match. Zod validates responses at runtime.
- **Modules (ADR-007, migration completed 2026-10-04):** every query/mutation hook lives in an
  entity (`src/entities/{address,admin,auth,cart,catalog,checkout,compare,favorites,loyalty,notifications,orders,payment,promo,qa,reviews,search,web-push}`).
  `src/lib/api/` keeps the client, services, mappers and shared query keys only; ESLint
  (`no-restricted-imports`) blocks `@/lib/api/hooks*`. See [src/lib/api/README.md](../src/lib/api/README.md).
- **Proxy:** `src/proxy.ts` (Next 16 replacement for `middleware.ts`) handles locale prefixes, see
  [i18n](#internationalisation-adr-010).

## Storefront features

### Catalog and discovery

- Product list (`/products`) with search, price range, brand and category filters, sort options,
  pagination, empty-state presets and saved searches (`src/entities/search`). The page is a Server Component that
  prefetches the product query and hydrates the client island (`AdvancedSearchResults`); server and
  client build the query key from the same function (`src/entities/search/lib/apiParams.ts`).
- Product detail (`/products/[slug]`) with image gallery (swipe gestures on touch), variants
  (size/colour), reviews (incl. owner-only delete), Q&A, JSON-LD, related products,
  frequently-bought-together and customers-also-viewed. Server-rendered with hydration; a 404 from
  the API renders the storefront not-found page.
- Homepage sections: categories, brands, featured products, personalized recommendations
  (signed-in users), category quick navigation.
- Search autocomplete with recent searches (persisted, max 8) and a search history page
  (`/account/searches`).
- Product comparison (up to 3 products, `/compare`), product quick view, favorites.
- Vouchers (`/vouchers`) and flash sales (`/flash-sales`) read live campaigns from the API.

### Cart and checkout

- Cart page and drawer with optimistic updates, voucher/promo codes, save-for-later, guest cart
  bootstrapped once by `AppInitializer` in the root layout.
- Multi-step checkout: address selection and management, shipping quote, payment method selection,
  review page with payment instructions (bank/QR details), payment-proof upload and status polling,
  success and failed pages.

### Account

- Dashboard, orders (history with pull-to-refresh, detail, cancellation), order tracking with a
  Leaflet map (`/order/tracking/[orderId]`, geocoding via `/api/geocode/search`), profile,
  addresses, in-app notifications (navbar bell + `/account/notifications`), push notification
  settings (`/account/push-settings`), privacy (preferences, data export, account deletion),
  support tickets, loyalty, saved searches.
- Returns (`/returns`) and support workflows, with admin counterparts.
- Auth: login, register (confirm password, strength meter, terms checkbox), social login, forgot
  and reset password, email verification, idle-timeout warning.

### UX, accessibility and resilience

- Breadcrumbs, back-to-top, keyboard shortcuts, offline banner, high-contrast mode and theme
  selector, `prefers-reduced-motion` support.
- Route-level `loading.tsx` for products, product detail, account, cart, checkout and admin.
- Error boundaries: `src/app/global-error.tsx` (bilingual, outside providers),
  `(storefront)/error.tsx` and `(admin)/error.tsx` via `RouteErrorFallback` (reports to Sentry
  once per error), root and segment `not-found.tsx`.
- Newsletter signup in the footer: the UI is enabled and calls `newsletterApi.subscribe`, but the
  endpoint is not in `openapi.yaml` and has no mock (ROADMAP M9 keeps it open).

## Admin dashboard

- Pages under `src/app/(admin)/admin/`: overview, products (list, create, edit), categories,
  brands, orders (status transitions), inventory, vouchers, flash sales, customers, returns,
  support tickets, analytics, audit logs, webhooks, settings.
- Data layer in `src/entities/admin/` (`api/`, `hooks/`, `types/`, `keys.ts`, `format.ts`).
- Every page shows `AdminLoading` while pending and `AdminError` (with retry) on failure (brands and
  categories through `TaxonomyManager`); list pages use `AdminEmpty` for empty results.
- Access requires a user with the `admin` role (`AdminGuard`).
- Fully translated (`admin` namespace, Indonesian in `id`, English in `en`).

## Mock API

- In-process mock API at `src/app/api/v1/[[...path]]/route.ts`, a thin wrapper over
  `src/mocks/route.ts` and per-domain resolvers in `src/mocks/resolvers/`. MSW handlers
  (`src/mocks/handlers*.ts`) use the same fixtures, so both layers return identical ids.
- Fixtures (`src/mocks/fixtures.ts`) are built from seeded Faker factories (`src/mocks/factories/`);
  curated catalog titles/slugs are passed as overrides and product ids stay `stableUuid(slug)`.
- Admin endpoints (products CRUD, stock, categories, brands, orders, status, stats, analytics
  overview) require the bearer token `mock-admin-token`; `auth/me` returns `roles: ['admin']` for it.
- Mock code is excluded from real-API builds by inline `process.env` guards around every
  `import('@/mocks/…')`; `tests/config/mock-gate.test.ts` enforces this and
  `production-validation.yml` greps the build output for fixture leaks.
- Modes: `pnpm dev` (MSW + route), `pnpm dev:e2e` (route, used by Playwright),
  `pnpm build:mock && pnpm start:mock` (production build against the in-process mock, no MSW).

## PWA and service worker (ADR-009)

- One worker, `src/app/sw.ts` (+ push handlers in `src/app/sw-push.ts`), compiled by
  `@serwist/turbopack` through `src/app/serwist/[path]/route.ts` and served at `/serwist/sw.js`.
- Registered only in production (or with `NEXT_PUBLIC_SW_DEV=true`), so it never competes with MSW
  in development. `skipWaiting`, `clientsClaim`, navigation preload; `reloadOnOnline` is off.
- Runtime caching: Google Fonts and images only. API responses and pages are never cached.
  Offline navigations fall back to the precached `/offline` page. The `activate` handler removes
  caches left by the old next-pwa worker.
- Web App Manifest (`public/manifest.json`, maskable SVG icons) and long-lived `Cache-Control`
  headers for images.
- Automated: `pnpm e2e:prod` (`tests/e2e/pwa.spec.ts`) checks `/serwist/sw.js` and `/offline` on a
  `build:mock` build.
- **Pending (manual):** in Chrome DevTools after `pnpm build:mock && pnpm start:mock`, confirm one
  registration at scope `/`, the offline fallback, and a push test notification (see
  [README](../README.md#pwa--offline-support)).

## Internationalisation (ADR-010)

- `next-intl` without a `[locale]` segment. Locales: `id` (default, unprefixed) and `en`
  (`/en/...`). `src/proxy.ts` rewrites `/en/...`, forwards the locale in the `x-toko-locale`
  request header and stores the `toko-locale` cookie; legacy `/zh`, `/ja`, `/ko` URLs redirect (308)
  to the unprefixed page.
- Catalogs `messages/id.json` and `messages/en.json` (13 namespaces, ~2,100 keys each, storefront
  and admin). `pnpm i18n:check` (part of `pnpm lint`) fails on key mismatch or empty values.
- `<html lang>` follows the request locale. Metadata and hreflang alternates (`id`, `en`,
  `x-default`) are translated; the sitemap lists both locales.
- Formatting through `useFormatter`/`getFormatter` and `src/shared/i18n/format.ts`: time zone
  `Asia/Jakarta`, `Rp 1.000.000` (id) / `IDR 1,000,000` (en), locale-aware dates and relative times.
- Known gaps: some non-component fallback strings are still Indonesian-only (API error fallbacks in
  `src/lib/api/utils.ts` and `src/shared/lib/normalizeError.ts`, label maps in
  `src/lib/api/constants.ts`). Every route renders dynamically because the locale is read per
  request (accepted trade-off; ISR is a ROADMAP item).

## Observability

- **Sentry** (`src/shared/telemetry/sentry.ts`, DSN-safe): error boundaries and failed loads
  (for example shipment tracking).
- **PostHog**: product and failure events (for example `newsletter_subscribed`,
  `shipment_tracking_load_failed`).
- Custom RUM via `web-vitals`.

## Testing and quality gates

| Layer              | Command                   | Notes                                                                  |
| ------------------ | ------------------------- | ---------------------------------------------------------------------- |
| Lint + i18n parity | `pnpm lint`               | ESLint, then `scripts/i18n/check-messages.mjs`                         |
| Docs links         | `pnpm lint:docs`          | Relative Markdown links must exist (`docs/archive/` excluded)          |
| Types              | `pnpm typecheck`          | App and service-worker `tsconfig`s                                     |
| Unit / integration | `pnpm test:ci --coverage` | Vitest + Testing Library; coverage thresholds enforced (ratchet)       |
| API contract       | `pnpm api:check`          | Generated types match `openapi.yaml`                                   |
| E2E                | `pnpm e2e`                | Playwright on `pnpm dev:e2e`; storefront, checkout, locale, SSR, admin |
| Production PWA     | `pnpm e2e:prod`           | Service worker on a `build:mock` build                                 |
| Lighthouse         | CI `lighthouse` job       | a11y/SEO hard, performance/best-practices warn                         |

- Contract tests: `src/lib/api/__tests__/api-contract.test.ts` (MSW-backed request/response shapes
  for auth, cart, checkout, orders, shipment tracking) and `tests/e2e/contract-real-api.spec.ts`
  (opt-in against a live API).
- Admin E2E: `tests/e2e/admin-products.spec.ts` (create, edit, delete) and
  `tests/e2e/admin-orders.spec.ts` (status transition persists). Other admin pages are covered by
  unit tests and `tests/e2e/admin-states.spec.ts` (loading/error states), not full CRUD flows.
- Coverage thresholds and the ratchet rule are documented in the
  [README](../README.md#testing--quality-gates).

## Pending and known gaps

- Manual service-worker checks in Chrome (scope, offline fallback, push) — see above.
- Lighthouse: confirm the `lighthouse` job passes on two consecutive CI runs after push, then
  ratchet thresholds (ROADMAP M5).
- Newsletter endpoint missing in the backend contract.
- Remaining Indonesian-only fallback strings outside the message catalogs.
- Admin E2E covers product CRUD and order status only.

See [ROADMAP.md](../ROADMAP.md) for the full list of planned work and technical debt.
