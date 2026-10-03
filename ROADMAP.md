# Roadmap — Toko Storefront

> Last updated: 2026-08-20
>
> For granular implementation status, see [docs/STATUS_IMPLEMENTASI.md](docs/STATUS_IMPLEMENTASI.md).
> For the completed UX audit, see [docs/UI_UX_GAPS_ANALYSIS.md](docs/UI_UX_GAPS_ANALYSIS.md) (all 41 items done).
> For the active backlog, see [docs/BACKLOG_AKTIF.md](docs/BACKLOG_AKTIF.md).

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

- [ ] Migrate from Webpack to Turbopack (blocked by `@ducanh2912/next-pwa` compatibility)
- [ ] Server Components adoption for data-heavy pages (catalog, product detail)
- [ ] Streaming SSR for above-the-fold content
- [ ] Image optimization audit (WebP/AVIF adoption, lazy loading tuning)
- [ ] Bundle size audit and tree-shaking improvements
- [ ] Lighthouse CI integration in GitHub Actions

### 🔲 M6 — Full Internationalization

- [ ] Translation file infrastructure (JSON/ICU message catalogs)
- [ ] Complete translation coverage for id, en
  - Note: zh, ja and ko were dropped on 2026-10-04; their URL prefixes now 308-redirect to the unprefixed `id` page.
- [ ] RTL layout support investigation
- [ ] Currency and date format localization
- [ ] Locale-aware SEO metadata

### 🔲 M7 — Testing & Observability

- [ ] Increase Vitest coverage to ≥ 80%
- [ ] E2E coverage for all critical user flows (checkout, auth, admin CRUD)
- [ ] Visual regression testing with Playwright screenshots
- [ ] Contract testing against live API (expand `contract-real-api.spec.ts`)
- [ ] Synthetic monitoring in production
- [ ] Error budget and SLO dashboards

### 🔲 M8 — Developer Experience

- [ ] Complete entity-based module migration (move remaining hooks from `lib/api/` to `entities/`)
- [ ] Storybook for component documentation
- [ ] API mock data generators (replace hand-written fixtures with Faker-based factories)
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

- [ ] Dual hook locations: `src/entities/` vs `src/lib/api/hooks.*.ts` — consolidate
- [ ] `@ducanh2912/next-pwa` Webpack lock-in — evaluate alternatives (`serwist`, `@vite-pwa/next`)
- [ ] MSW handler maintenance — automate handler generation from OpenAPI spec
- [ ] Legacy `/sw.js` push worker vs `pwa-sw.js` caching worker — unify service worker architecture
- [ ] Some admin pages lack loading/error skeletons
