# toko storefront

A modular Next.js storefront powered by TypeScript, Tailwind CSS, shadcn/ui, and TanStack Query. The project ships with a mock API powered by MSW for local development and can consume the Toko REST API through `NEXT_PUBLIC_API_URL`.

## Requirements

- Node.js 20+
- pnpm 8+

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The development server runs at [http://localhost:3000](http://localhost:3000). Mock data is served through MSW and can be disabled by setting `NEXT_PUBLIC_API_MOCKING=false` in `.env.local`.

### Available scripts

| Command           | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `pnpm dev`        | Start the Next.js development server with MSW mocks. |
| `pnpm build`      | Create an optimized production build.                |
| `pnpm start`      | Run the production server.                           |
| `pnpm lint`       | Lint the project using ESLint.                       |
| `pnpm typecheck`  | Run TypeScript in no-emit mode.                      |
| `pnpm test`       | Execute Vitest test suites once.                     |
| `pnpm test:watch` | Run Vitest in watch mode.                            |
| `pnpm format`     | Format the repository with Prettier.                 |

### PWA / Offline Support

The storefront includes Progressive Web App capabilities:

- **Service Worker** (via `next-pwa` + Workbox): Auto-registers in production with `skipWaiting` for instant updates
- **Runtime caching**: Google Fonts (1yr), images (30d), API responses (5min NetworkFirst)
- **Offline fallback**: `/offline` page with auto-reload when connectivity restored
- **Web App Manifest**: Installable with `display: standalone`, SVG maskable icons
- **Cache headers**: `stale-while-revalidate=86400` for all optimized images

To test offline capability locally, run `pnpm build && pnpm start` (service worker is disabled in development).

### Granular Code Splitting

Key pages use `React.lazy` + `Suspense` to defer heavy components until needed:

- **Product detail** (`/products/[slug]`): `ReviewStats`, `ReviewForm`, `ReviewList` lazy-loaded with shared skeleton
- **Checkout** (`/checkout`): `ShippingOptions`, `PaymentMethodSelector`, `OrderSummary` lazy-loaded with individual skeletons
- **Product image gallery**: Inner gallery component extracted for lazy loading

This produces 100+ separate chunks in `.next/static/chunks/`, reducing initial JavaScript payload.

### Folder structure

```
src/
├─ app/                # Next.js App Router routes and layouts
├─ components/         # UI primitives, widgets, and layout building blocks
├─ lib/                # API client helpers, schemas, utilities
├─ mocks/              # MSW handlers and worker/server setup
├─ stores/             # Zustand stores for shared client state
```

## API mocking vs. real backend

- **Mocking (default):** Set `NEXT_PUBLIC_API_URL=mock` (the value in `.env.example`) to use the built-in MSW handlers.
- **Real backend:** Set `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1` and `NEXT_PUBLIC_API_MOCKING=false` to use `toko-api`. Include `NEXT_PUBLIC_TENANT_ID` when the backend is running in a multi-tenant environment.

## API-backed storefront areas

The current storefront routes backed by the API include `/vouchers`, `/flash-sales`, `/returns`, `/account/support`, `/account/privacy`, `/checkout/review` payment instructions, and the admin `/admin/returns`, `/admin/support`, `/admin/inventory`, and `/admin/customers` pages. Locale-prefixed paths such as `/en/products` are rewritten to the same App Router pages by middleware.

## Testing & quality gates

The repository enforces formatting and linting through Husky + lint-staged. The CI workflow runs linting, type-checking, tests, and the production build to ensure regressions are caught automatically.

## Continuous integration

The GitHub Actions workflow defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) installs dependencies, runs linting, type checks, tests, and builds the application on every push and pull request.

## Contributing

1. Create a new branch for your feature or fix.
2. Make your changes and include tests where possible.
3. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before opening a pull request.
4. Follow the provided PR template.

## Documentation

For detailed guides, implementation status, and future backlogs, refer to:

- [Implementation Status](docs/STATUS_IMPLEMENTASI.md) — Current state of storefront integrations.
- [Integration Guide](docs/GUIDE_INTEGRASI.md) — Technical instructions for local development and API consumption.
- [API Contract Index](docs/contracts/README.md) — Frontend-facing API modules and adapters.
- [Active Backlog](docs/BACKLOG_AKTIF.md) — Current UX gaps, P2/P3 backlogs, and roadmap items.

## License

MIT
