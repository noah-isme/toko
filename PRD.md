# Product Requirements Document — Toko Storefront

## 1. Purpose

Toko is a modular e-commerce storefront built as the customer-facing frontend for the Toko platform. It enables shoppers to browse products, manage carts, complete checkouts, and track orders — while giving store operators an admin dashboard for inventory, orders, vouchers, and analytics.

## 2. Problem Statement

Small-to-medium merchants need a performant, mobile-first storefront that works out-of-the-box with minimal backend coupling. The existing backend (`toko-api`) exposes a REST API; this project provides the user interface layer that consumes it.

## 3. Target Users

| Persona         | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Shopper**     | End-customer browsing products, placing orders, tracking shipments                         |
| **Store Admin** | Merchant managing products, inventory, orders, vouchers, flash sales, and customer support |
| **Developer**   | Engineer extending the storefront or integrating new backend features                      |

## 4. Core Capabilities

### 4.1 Storefront (Customer-Facing)

- **Product catalog** — filterable, searchable product listing with category navigation, advanced filters, and autocomplete with search history
- **Product detail** — image gallery with swipe gestures, variant selection, Q&A, reviews with star ratings, and related product recommendations
- **Cart & checkout** — multi-step checkout (address → shipping → payment → review), guest cart bootstrap, save-for-later, voucher/promo application
- **Order lifecycle** — order confirmation, real-time tracking with interactive Leaflet map, order history, cancellation with reason selection, returns workflow
- **Authentication** — login, registration (with social login), email verification, forgot/reset password flows
- **Account management** — profile editing, address book with geocoding, loyalty points, notification preferences (in-app and push), privacy controls (data export/deletion), search history
- **Promotions** — voucher discovery page, flash sales with countdown timers, featured products
- **Product comparison** — side-by-side comparison matrix for up to 3 products
- **Favorites/wishlist** — persistent favorites list

### 4.2 Admin Dashboard

- **Product management** — CRUD for products, categories, and brands with taxonomy manager
- **Order management** — order listing, status updates, returns processing
- **Promotions** — voucher creation/management, flash sale campaigns
- **Inventory** — stock tracking and management
- **Customer management** — customer listing and support ticket handling
- **Analytics** — overview dashboard
- **Audit logs** — administrative action history
- **Webhooks** — webhook configuration
- **Settings** — store configuration

### 4.3 Platform Capabilities

- **PWA / Offline** — installable as a Progressive Web App with offline fallback page, service worker caching (fonts, images), push notifications
- **Internationalization** — locale routing for `id` (default, unprefixed) and `en` (`/en/...`) via the Next.js proxy (`src/proxy.ts`)
- **SEO** — JSON-LD structured data, per-page metadata, robots/sitemap support
- **Observability** — PostHog analytics, Sentry error tracking, custom RUM (Real User Monitoring) transport
- **Performance** — granular code splitting via React.lazy, image optimization, stale-while-revalidate caching

## 5. Out of Scope

- Backend API development (handled by `toko-api`)
- Payment gateway integration (the storefront handles payment instructions and proof upload; actual processing is backend-side)
- Full i18n translation content (routing infrastructure is in place; translation files are a separate workstream)
- Native mobile apps

## 6. Success Metrics

| Metric                          | Target       |
| ------------------------------- | ------------ |
| Lighthouse Performance score    | ≥ 90         |
| Time to Interactive (3G)        | < 3s         |
| Core Web Vitals (LCP, CLS, FID) | All "Good"   |
| Test coverage (Vitest)          | ≥ 80%        |
| E2E critical-path pass rate     | 100%         |
| Zero-downtime deployments       | Yes (Vercel) |

## 7. Constraints

See [ADRs](docs/adr/) for recorded architectural decisions. Key constraints:

- Must consume the `toko-api` REST API contract — no direct database access
- TypeScript-only codebase
- Deployable on Vercel (SSR + edge middleware)
- MSW-based mocking must allow full frontend development without a running backend
