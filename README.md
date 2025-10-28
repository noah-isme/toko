# toko storefront

A modular Next.js storefront powered by TypeScript, Tailwind CSS, shadcn/ui, and TanStack Query. The project is wired to consume a RESTful backend at `http://localhost:8080/api/v1` by default and ships with a mock API powered by MSW for local development.

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

- **Mocking (default):** MSW automatically intercepts requests when `NODE_ENV=development` and `NEXT_PUBLIC_API_MOCKING` is not set to `false`.
- **Real backend:** Set `NEXT_PUBLIC_API_MOCKING=false` and adjust `NEXT_PUBLIC_API_URL` to point at your backend. No code changes are required.

## Testing & quality gates

The repository enforces formatting and linting through Husky + lint-staged. The CI workflow runs linting, type-checking, tests, and the production build to ensure regressions are caught automatically.

## Continuous integration

The GitHub Actions workflow defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) installs dependencies, runs linting, type checks, tests, and builds the application on every push and pull request.

## Contributing

1. Create a new branch for your feature or fix.
2. Make your changes and include tests where possible.
3. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before opening a pull request.
4. Follow the provided PR template.

## License

MIT
