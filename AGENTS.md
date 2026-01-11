# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` holds Next.js App Router routes and layouts (for example, `src/app/(storefront)/products/[slug]/page.tsx`).
- `src/components/` contains reusable UI building blocks; `src/entities/`, `src/hooks/`, `src/lib/`, and `src/shared/` group domain, hooks, API/helpers, and shared utilities.
- `src/mocks/` contains MSW handlers and setup; `src/stores/` holds Zustand state.
- `public/` stores static assets; `tests/` houses most Vitest suites, with E2E specs in `tests/e2e/`.
- Some unit tests live alongside code under `src/**/__tests__/`.

## Build, Test, and Development Commands
- `pnpm dev`: start the local Next.js server with MSW mocks enabled.
- `pnpm build` / `pnpm start`: create and run a production build.
- `pnpm lint`: run ESLint (Next.js + custom import and Tailwind rules).
- `pnpm typecheck`: run TypeScript in no-emit mode.
- `pnpm test` / `pnpm test:watch`: run Vitest once or in watch mode.
- `pnpm e2e`: run Playwright end-to-end tests.
- `pnpm format`: format with Prettier.

## Coding Style & Naming Conventions
- TypeScript is the default; keep modules small and favor hooks/utilities in `src/hooks/` and `src/lib/`.
- Prettier enforces 2-space indentation, single quotes, semicolons, trailing commas, and 100-char lines.
- ESLint enforces ordered imports and Tailwind class ordering; rely on `pnpm lint` and `pnpm format` before commits.
- File naming follows existing patterns: `page.tsx` for routes, `*.test.tsx` for Vitest, and `*.spec.ts` for Playwright.

## Testing Guidelines
- Use Vitest + Testing Library for component and integration tests in `tests/` or `src/**/__tests__/`.
- Use Playwright for user flows in `tests/e2e/`.
- Test names are descriptive and user-focused; follow the existing `feature.action.test.tsx` or `feature.flow.spec.ts` style.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (`feat:`, `fix(scope):`, `docs:`, `refactor:`, `chore:`, `test:`), enforced by commitlint.
- PRs must follow `.github/PULL_REQUEST_TEMPLATE.md` with a short summary and a testing checklist.
- Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before opening a PR.

## Configuration & Mocking
- Copy `.env.example` to `.env.local` for local setup.
- MSW is enabled by default in development; set `NEXT_PUBLIC_API_MOCKING=false` and adjust `NEXT_PUBLIC_API_URL` to use a real backend.
