# Toko Storefront

[![CI](https://github.com/noah-isme/toko/actions/workflows/ci.yml/badge.svg)](https://github.com/noah-isme/toko/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-20.19.x-green.svg)](.nvmrc)
[![pnpm](https://img.shields.io/badge/pnpm-10.5.2-orange.svg)](package.json)

A modular Next.js storefront powered by TypeScript, Tailwind CSS, shadcn/ui, and TanStack Query. Ships with a complete mock API via MSW for frontend-only development and consumes the Toko REST API in production.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [API Mocking vs. Real Backend](#api-mocking-vs-real-backend)
- [Testing & Quality Gates](#testing--quality-gates)
- [Continuous Integration](#continuous-integration)
- [PWA / Offline Support](#pwa--offline-support)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20.19.x (see [`.nvmrc`](.nvmrc))
- [pnpm](https://pnpm.io/) 10.5.2

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env.local

# 3. Start the dev server
pnpm dev
```

The development server runs at [http://localhost:3000](http://localhost:3000). Mock data is served through MSW by default and can be disabled by setting `NEXT_PUBLIC_API_MOCKING=false` in `.env.local`.

## Available Scripts

| Command                    | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `pnpm dev`                 | Start the Next.js development server with MSW mocks |
| `pnpm build`               | Create an optimized production build                |
| `pnpm start`               | Run the production server                           |
| `pnpm lint`                | Lint the project with ESLint                        |
| `pnpm typecheck`           | Run TypeScript type checking (no emit)              |
| `pnpm test`                | Execute Vitest test suites once                     |
| `pnpm test:ci`             | Execute Vitest in CI-friendly forked-worker mode    |
| `pnpm test:watch`          | Run Vitest in watch mode                            |
| `pnpm e2e`                 | Run Playwright end-to-end tests                     |
| `pnpm format`              | Format the repository with Prettier                 |
| `pnpm deployment:validate` | Validate deployment environment variables           |
| `pnpm analyze`             | Build with bundle analyzer enabled                  |

## Project Structure

```
toko/
├── .github/               # CI workflows, PR and issue templates
├── docs/                   # Detailed guides, API contracts, ADRs
│   ├── adr/                # Architecture Decision Records
│   └── contracts/          # Frontend API contract documentation
├── public/                 # Static assets, manifest, service workers
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (storefront)/   #   Customer-facing pages
│   │   ├── (admin)/        #   Admin dashboard pages
│   │   └── api/            #   API routes (health, geocode, proxy)
│   ├── components/         # UI primitives (shadcn/ui) and feature components
│   ├── entities/           # Domain modules (cart, orders, reviews, auth, ...)
│   ├── hooks/              # Shared React hooks
│   ├── lib/                # API client, utilities, schemas, geocoding
│   ├── mocks/              # MSW handlers and setup
│   ├── shared/             # Cross-cutting: config, telemetry, SEO, RUM
│   └── stores/             # Zustand stores (cart, compare, search history)
├── tests/                  # Vitest test suites
│   └── e2e/                # Playwright end-to-end specs
├── AGENTS.md               # Agent / AI coding guidelines
├── ARCHITECTURE.md         # System architecture overview
├── DESIGN.md               # Design system and component reference
├── PRD.md                  # Product Requirements Document
└── ROADMAP.md              # Planned work and technical debt
```

## API Mocking vs. Real Backend

| Mode               | Configuration                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Mock (default)** | `NEXT_PUBLIC_API_URL=mock` — uses built-in MSW handlers                                                         |
| **Real backend**   | `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1` and `NEXT_PUBLIC_API_MOCKING=false` — connects to `toko-api` |

Include `NEXT_PUBLIC_TENANT_ID` when the backend runs in a multi-tenant environment.

For Vercel project setup, preview/staging tenants, CORS prerequisites, and production validation, see [Vercel Deployment](docs/VERCEL_DEPLOYMENT.md).

## Testing & Quality Gates

The repository enforces quality through multiple layers:

- **Husky + lint-staged** — pre-commit hooks run ESLint and Prettier on staged files
- **Vitest + Testing Library** — component and integration tests in `tests/` and `src/**/__tests__/`
- **Playwright** — end-to-end tests for critical user flows in `tests/e2e/`
- **TypeScript** — strict mode with `noEmit` type checking
- **API contract conformance** — `pnpm api:check` verifies generated types match the OpenAPI spec

Run the full quality gate locally before opening a PR:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Continuous Integration

GitHub Actions workflows run on every push and pull request to `main`:

- [**CI**](.github/workflows/ci.yml) — install → lint → api:check → typecheck → test → build → e2e
- [**Production Validation**](.github/workflows/production-validation.yml) — builds with production-shaped variables (no real API credentials required)

## PWA / Offline Support

The storefront is a Progressive Web App:

- **Service Worker** (via `next-pwa` + Workbox): auto-registers `/pwa-sw.js` in production with `skipWaiting`
- **Runtime caching**: Google Fonts (1 year) and images (30 days); API responses are excluded
- **Offline fallback**: `/offline` page with auto-reload on connectivity restoration
- **Web App Manifest**: installable with `display: standalone`, SVG maskable icons
- **Push notifications**: separate `/sw.js` worker for push events

> **Note:** Service worker is disabled in development. Test offline capability with `pnpm build && pnpm start`.

## Documentation

### Project-Level

| Document                           | Purpose                                                            |
| ---------------------------------- | ------------------------------------------------------------------ |
| [PRD.md](PRD.md)                   | Why we're building this — product requirements and success metrics |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, layer structure, and tech stack               |
| [DESIGN.md](DESIGN.md)             | Design system, component library, and interaction patterns         |
| [ROADMAP.md](ROADMAP.md)           | Planned milestones, future work, and technical debt                |
| [AGENTS.md](AGENTS.md)             | Guidelines for AI coding agents working in this repo               |
| [docs/adr/](docs/adr/)             | Architecture Decision Records (8 ADRs)                             |

### Detailed Guides

| Document                                             | Purpose                                        |
| ---------------------------------------------------- | ---------------------------------------------- |
| [Implementation Status](docs/STATUS_IMPLEMENTASI.md) | Current state of feature integrations          |
| [Integration Guide](docs/GUIDE_INTEGRASI.md)         | Technical instructions for API consumption     |
| [API Contract Index](docs/contracts/README.md)       | Frontend-facing API modules and adapters       |
| [Active Backlog](docs/BACKLOG_AKTIF.md)              | UX gaps, P2/P3 backlogs, and remaining work    |
| [Vercel Deployment](docs/VERCEL_DEPLOYMENT.md)       | Deployment setup and environment configuration |

## Contributing

1. Fork the repository and create a feature branch.
2. Make your changes and include tests where applicable.
3. Run the [quality gate](#testing--quality-gates) before opening a PR.
4. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages (`feat:`, `fix:`, `docs:`, etc.).
5. Fill out the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

See [AGENTS.md](AGENTS.md) for coding style, naming conventions, and testing guidelines.

## License

This project is licensed under the [MIT License](LICENSE).
