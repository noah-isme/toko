# Toko Storefront

Modern Next.js 16 storefront scaffold ready to connect to the `http://localhost:8080/api/v1` backend. The project is built
with TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, and MSW to provide a productive developer experience and a
realistic mock catalogue out of the box.

## Features

- **Next.js 16 App Router** with React 19 and strict TypeScript configuration.
- **Design system** powered by Tailwind CSS, shadcn/ui, Radix primitives, and lucide icons.
- **Data layer** using a typed `apiClient`, TanStack Query hooks, and Zod validation for every API response.
- **State management** with Zustand for lightweight UI state (cart drawer, filters).
- **Mock API** provided by MSW and FakerJS, automatically enabled during development.
- **Quality tooling** including ESLint, Prettier, Husky + lint-staged, Commitlint, Vitest, and GitHub Actions CI.

## Requirements

- Node.js 20+
- pnpm 8+

## Getting started

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy the environment file and adjust values as needed:
   ```bash
   cp .env.example .env.local
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```

The MSW worker starts automatically in development, providing mock responses for `/products`, `/products/:slug`, `/cart`,
and `/auth/me`. Visit [http://localhost:3000](http://localhost:3000) to browse the storefront.

## Available scripts

- `pnpm dev` – start Next.js in development mode (MSW enabled).
- `pnpm lint` – run ESLint with the project rules.
- `pnpm test` – execute Vitest unit tests.
- `pnpm typecheck` – run TypeScript in no-emit mode.
- `pnpm build` – create a production build of the app.
- `pnpm format` / `pnpm format:check` – write or check Prettier formatting.

## Project structure

```
src/
  app/
    (storefront)/        # Storefront routes (home, product detail, cart, auth, checkout)
    health/              # SSR health check page that calls the API
    layout.tsx           # Root layout with shared providers and navigation
    providers.tsx        # Client-side providers (TanStack Query, MSW)
  components/
    layout/              # Navbar, footer, container
    ui/                  # shadcn/ui primitives (button, input, card, dialog, label)
    widgets/             # Storefront widgets (ProductCard, Price, Rating, etc.)
  lib/
    api/                 # Fetch wrapper, query keys, schemas, and hooks
    msw/                 # Development MSW bootstrap
    utils.ts             # UI utilities (`cn`, currency formatter)
  mocks/                 # MSW handlers for products, cart, auth, health
  stores/                # Zustand stores for UI state
```

## Switching between mock and real APIs

- Update `NEXT_PUBLIC_API_URL` in `.env.local` to point to the real backend.
- Restart the dev server. In production builds MSW is not started, so requests will hit the configured backend directly.
- All fetches go through `src/lib/api/apiClient.ts`, ensuring `credentials: 'include'` and Zod validation.

## Continuous integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs linting, type checking, tests, and a production build on every
push or pull request.

## Contributing

- Commit messages must follow the Conventional Commits specification (enforced via Commitlint).
- Husky runs lint-staged on staged files to keep formatting consistent.
- Open an issue using the provided templates before starting major work.
