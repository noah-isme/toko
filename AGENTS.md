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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
