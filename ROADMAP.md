# Roadmap — Toko Storefront

> Last updated: 2026-10-12
>
> For implementation status, pending manual checks and known gaps, see [docs/STATUS.md](docs/STATUS.md).
> The completed 41-item UX audit and the former backlog are kept in [docs/archive/](docs/archive/README.md)
> ([UI_UX_GAPS_ANALYSIS.md](docs/archive/UI_UX_GAPS_ANALYSIS.md), [BACKLOG_AKTIF.md](docs/archive/BACKLOG_AKTIF.md)).

## Completed Milestones

### ✅ M1 — Core Storefront (Done)

- Product catalog with search, filters, and pagination
- Product detail with image gallery, reviews, Q&A
- Cart and multi-step checkout flow
- Authentication (login, register, social login, forgot/reset password, email verification)
- Order lifecycle (confirmation, tracking with Leaflet map, history, cancellation, returns)

### ✅ M2 — Admin Dashboard (Done)

- Product/category/brand CRUD with taxonomy manager
- Order management and status updates
- Voucher and flash sale campaigns
- Inventory management
- Customer management and support tickets
- Analytics overview and audit logs

### ✅ M3 — UX Polish & Mobile (Done)

- All 41 UX audit items completed
- PWA with offline fallback and push notifications
- Pull-to-refresh, swipe gestures, back-to-top
- Search history and autocomplete
- Product comparison (up to 3 products)
- Save-for-later in cart
- Breadcrumbs and keyboard shortcuts

### ✅ M4 — API Integration & Quality (Done)

- Full REST API integration (vouchers, flash sales, returns, support, privacy, payment instructions)
- OpenAPI codegen type-safety pipeline with CI enforcement
- Locale-prefixed routing (id default, en)
- PostHog analytics + Sentry error tracking + custom RUM
- Vercel deployment with preview/production validation

## Planned Work

### 🔲 M5 — Performance & Reliability

- [x] Migrate from Webpack to Turbopack (next-pwa replaced by `@serwist/turbopack`, ADR-009)
- [x] Server Components adoption for data-heavy pages (catalog, product detail): server prefetch + React Query hydration, also in mock mode
- [ ] Streaming SSR for above-the-fold content
- [ ] Image optimization audit (WebP/AVIF adoption, lazy loading tuning)
- [ ] Bundle size audit and tree-shaking improvements
- [x] Lighthouse CI integration in GitHub Actions (`lighthouse` job, `lighthouserc.json`)
  - Pending (manual): confirm the job passes on two consecutive CI runs after the branch is pushed.
- [ ] Ratchet Lighthouse thresholds up: a11y/SEO hard gates start at min(target, baseline − 0.02); promote performance (baseline 0.80–0.97) and best-practices (`/` at 0.74: third-party cookies, console errors) from warn to error once they hold the 0.8/0.9 targets, and bring script size under the 400 KB budget (currently ~580–640 KB)
- [ ] ISR/`revalidate` for catalog server fetches (`serverApiGet` uses `cache: 'no-store'` and every route is dynamic since i18n reads the locale per request)
- [ ] Manual service-worker checks in Chrome: one registration at scope `/`, offline fallback to `/offline`, DevTools push test (see README "PWA / Offline Support")

### 🔲 M6 — Full Internationalization

- [x] Translation file infrastructure (JSON/ICU message catalogs): `next-intl`, `messages/{id,en}.json`, `pnpm i18n:check` in lint (ADR-010)
- [x] Complete translation coverage for id, en (storefront and admin UI)
  - Note: zh, ja and ko were dropped on 2026-10-04; their URL prefixes now 308-redirect to the unprefixed `id` page.
- [x] Translate admin strings to Indonesian (admin UI was English-only; now `admin` namespace in both catalogs, done 2026-10-12)
- [ ] Localize remaining non-catalog fallback strings (API error fallbacks in `src/lib/api/utils.ts` and `src/shared/lib/normalizeError.ts`, label maps in `src/lib/api/constants.ts` are still Indonesian-only)
- [ ] Re-introduce additional locales if required (add to `LOCALES`, add a catalog passing `i18n:check`, remove from `LEGACY_LOCALES`)
- [ ] RTL layout support investigation
- [x] Currency and date format localization (`useFormatter`/`src/shared/i18n/format.ts`: `Rp 1.000.000` / `IDR 1,000,000`, `Asia/Jakarta`)
- [x] Locale-aware SEO metadata (translated titles/descriptions, hreflang `id`/`en`/`x-default`, sitemap alternates)

### 🔲 M7 — Testing & Observability

- [ ] Increase Vitest coverage to ≥ 80% (2026-10-12 baseline: 53.89% statements/lines, 72.5% branches, 62.59% functions)
- [x] Vitest coverage thresholds (ratchet): enforced in CI via `pnpm test:ci --coverage`; rules in README "Testing & Quality Gates"
- [ ] E2E coverage for all critical user flows (checkout, auth, admin CRUD)
  - [x] Admin CRUD, partial: product create/edit/delete and order status transition (`tests/e2e/admin-products.spec.ts`, `tests/e2e/admin-orders.spec.ts`)
  - [ ] Remaining admin CRUD flows (categories, brands, vouchers, flash sales, inventory, returns, support)
- [ ] Visual regression testing with Playwright screenshots
- [ ] Contract testing against live API (expand `contract-real-api.spec.ts`)
- [ ] Synthetic monitoring in production
- [ ] Error budget and SLO dashboards

### 🔲 M8 — Developer Experience

- [x] Complete entity-based module migration (move remaining hooks from `lib/api/` to `entities/`; ADR-007, 2026-10-04)
- [ ] Storybook for component documentation
- [x] API mock data generators (seeded Faker factories in `src/mocks/factories/`; curated catalog titles/slugs kept as overrides)
- [ ] Automated OpenAPI sync from backend repo
- [ ] Contribution onboarding guide improvements

### 🔲 M9 — Advanced Features (Tentative)

- [ ] Real-time order status via WebSocket/SSE
- [ ] Customer chat/messaging with support agents
- [ ] Personalized product recommendations (ML-backed)
- [ ] A/B testing framework integration
- [ ] Multi-store/tenant UI support
- [ ] Newsletter signup (backend endpoint pending)

## Technical Debt

- [x] Dual hook locations: `src/entities/` vs `src/lib/api/hooks.*.ts` — consolidated into `src/entities/`; ESLint blocks `@/lib/api/hooks*`
- [x] `@ducanh2912/next-pwa` Webpack lock-in — replaced by `@serwist/turbopack` (ADR-009)
- [x] MSW handler maintenance — MSW handlers and the mock route share resolvers and seeded fixtures (`src/mocks/resolvers/`, `src/mocks/fixtures.ts`)
  - [ ] Automate handler generation from the OpenAPI spec (not done)
- [x] Legacy `/sw.js` push worker vs `pwa-sw.js` caching worker — unified into one Serwist worker (`src/app/sw.ts` + `sw-push.ts`)
- [x] Some admin pages lack loading/error skeletons — every admin page has `AdminLoading`/`AdminError` states
