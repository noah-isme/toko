# Architecture — Toko Storefront

## Overview

Toko is a Next.js 16 App Router application written in TypeScript. It acts as a frontend client to the `toko-api` REST backend. The architecture is organized around domain entities, a centralized API layer, and a component library built on Radix UI + Tailwind CSS.

```
┌─────────────────────────────────────────────────┐
│                   Browser                       │
│  PWA shell · Service Worker · Push notifications│
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Next.js App Router                 │
│  Middleware (locale rewrite, cookie)            │
│  ┌────────────────┐  ┌────────────────────────┐ │
│  │ (storefront)   │  │ (admin)                │ │
│  │  layout.tsx    │  │  layout.tsx             │ │
│  │  /products     │  │  /admin/orders          │ │
│  │  /cart         │  │  /admin/products        │ │
│  │  /checkout     │  │  /admin/vouchers        │ │
│  │  /account/*    │  │  /admin/flash-sales     │ │
│  │  ...           │  │  ...                    │ │
│  └────────────────┘  └────────────────────────┘ │
│  ┌──────────────────────────────────────────────┤
│  │ API Routes: /api/health, /api/geocode/*,     │
│  │             /api/v1/[[...path]] (proxy)       │
│  └──────────────────────────────────────────────┤
└──────────────────────┬──────────────────────────┘
                       │ fetch (apiClient)
┌──────────────────────▼──────────────────────────┐
│          toko-api (REST backend)                │
│          or MSW mock handlers                   │
└─────────────────────────────────────────────────┘
```

## Layer Structure

### `src/app/` — Routes & Layouts

Next.js App Router with two route groups:

- **`(storefront)`** — Customer-facing pages (products, cart, checkout, account, etc.)
- **`(admin)`** — Admin dashboard behind `/admin/*`
- **`api/`** — Server-side API routes (health check, geocoding proxy, API passthrough)

Each route group has its own `layout.tsx` controlling shared navigation, providers, and styling.

### `src/components/` — UI Components

- **`ui/`** — Primitives built on Radix UI (Button, Card, Dialog, Table, Input, etc.) styled with Tailwind + CVA
- **`admin/`** — Admin-specific components (page headers, loading states, taxonomy manager)
- **Feature components** — Product catalog, cart view, checkout stepper, product detail, notification bell, etc.
- **`lazy-components.tsx`** — Central registry of React.lazy wrappers for code-split components

### `src/entities/` — Domain Modules

Organized by business domain, each entity folder contains:

| Entity      | Contents                                                                   |
| ----------- | -------------------------------------------------------------------------- |
| `address`   | Types, Zod schemas, hooks, API service, AddressForm/AddressBook components |
| `auth`      | Schemas, hooks (useAuth), login/register logic                             |
| `cart`      | Hooks (useCart, useAddToCart), API integration                             |
| `checkout`  | Multi-step checkout hooks and API                                          |
| `compare`   | Product comparison hooks                                                   |
| `favorites` | Wishlist hooks                                                             |
| `loyalty`   | Loyalty points hooks                                                       |
| `orders`    | Order hooks and API                                                        |
| `payment`   | Payment method types                                                       |
| `promo`     | Voucher/promotion hooks                                                    |
| `qa`        | Product Q&A hooks                                                          |
| `reviews`   | Review hooks and API                                                       |
| `search`    | Search hooks and types                                                     |
| `web-push`  | Push notification types and hooks                                          |

### `src/lib/` — API & Utilities

- **`api/apiClient.ts`** — Central fetch-based HTTP client with JWT token refresh, tenant headers, Zod validation, and error normalization
- **`api/hooks.admin.ts`** / **`api/hooks.react-query.ts`** — TanStack React Query hooks for admin and storefront data fetching
- **`api/services/`** — Low-level service functions grouped by domain
- **`api/generated/schema.d.ts`** — TypeScript types auto-generated from `openapi.yaml` via `openapi-typescript`
- **`api/generated/conformance.ts`** — Compile-time assertion that hand-written types match generated ones
- **`utils.ts`** — `cn()` utility (clsx + tailwind-merge), the most-connected node in the codebase (244 edges)
- **`geocoding/`** — Geocoding API client for address lookup
- **`keyboard-shortcuts.ts`** — Global keyboard shortcut handling

### `src/shared/` — Cross-Cutting Concerns

- **`config/env.ts`** — Environment variable parsing, deployment detection, production validation
- **`rum/`** — Real User Monitoring transport (custom beacon-based telemetry)
- **`seo/`** — JSON-LD generators for structured data
- **`telemetry/`** — PostHog and Sentry integration wrappers
- **`ui/`** — Shared UI primitives (toast system)

### `src/stores/` — Client State (Zustand)

| Store                      | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `cart-store.ts`            | Client-side cart state and persistence   |
| `compare-store.ts`         | Product comparison selection (max 3)     |
| `saved-for-later-store.ts` | Items saved from cart for later          |
| `search-store.ts`          | Search history (last 8 terms, persisted) |

### `src/mocks/` — MSW Mock API

A complete mock layer using Mock Service Worker (MSW 2.x). Handlers mirror the `toko-api` contract, enabling full frontend development without a running backend. Organized by domain: `handlers.ts`, `handlers.reviews.ts`, `handlers.qa.ts`, `handlers.notifications.ts`, etc.

## Key Architectural Patterns

### API Communication

```
Component → React Query Hook → apiClient.ts → fetch → toko-api (or MSW)
                                     ↓
                              Zod schema validation
                                     ↓
                              Typed response
```

- All API calls go through `apiClient` which handles auth headers, tenant ID injection, token refresh, and error normalization
- Response data is validated at runtime with Zod schemas
- TanStack React Query manages server-state caching, refetching, and optimistic updates

### Type Safety Pipeline

```
openapi.yaml → openapi-typescript → schema.d.ts → conformance.ts (compile-time check)
                                                       ↑
                                            hand-written types must match
```

CI runs `pnpm api:check` to ensure generated types haven't drifted from the OpenAPI spec.

### Code Splitting Strategy

Heavy components are lazily loaded via `React.lazy` + `Suspense`:

- Product detail: ReviewStats, ReviewForm, ReviewList
- Checkout: ShippingOptions, PaymentMethodSelector, OrderSummary
- Product image gallery: inner gallery component

This produces 100+ chunks, reducing initial JS payload.

### Proxy

A single proxy (`src/proxy.ts`) handles locale routing for the supported locales `id` (default, unprefixed) and `en` (`/en/...`), configured in `src/i18n/config.ts`. URL paths like `/en/products` are rewritten to `/products` while setting a `toko-locale` cookie and forwarding the resolved locale to server code as the `x-toko-locale` request header. Unprefixed paths keep a valid cookie locale (an unsupported one is reset to `id`), and legacy `/zh`, `/ja` and `/ko` prefixes are permanently redirected (308) to the unprefixed page. No auth middleware exists at the edge — authentication is handled client-side via token management.

## Technology Stack

| Layer           | Technology                                              |
| --------------- | ------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, React 19)                       |
| Language        | TypeScript 5.6                                          |
| Styling         | Tailwind CSS 3.4 + CVA + tailwind-merge                 |
| Components      | Radix UI primitives + custom shadcn/ui-style components |
| State (server)  | TanStack React Query 5                                  |
| State (client)  | Zustand 5                                               |
| Forms           | React Hook Form 7 + Zod validation                      |
| API types       | openapi-typescript (code-gen from OpenAPI spec)         |
| Mocking         | MSW 2.x                                                 |
| Icons           | Lucide React                                            |
| Maps            | Leaflet + React Leaflet                                 |
| Analytics       | PostHog                                                 |
| Error tracking  | Sentry                                                  |
| Testing         | Vitest + Testing Library + Playwright                   |
| CI/CD           | GitHub Actions → Vercel                                 |
| Package manager | pnpm 10.5                                               |
