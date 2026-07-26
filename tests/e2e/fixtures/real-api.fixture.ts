import { test as base, type Page } from '@playwright/test';

// Real API base URL - can be overridden via environment variable
const REAL_API_URL = process.env.PLAYWRIGHT_REAL_API_URL ?? 'http://localhost:8080/api/v1';

// Real frontend base URL - can be overridden via environment variable
const REAL_FRONTEND_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

type RealApiFixtures = {
  apiBaseUrl: string;
  frontendBaseUrl: string;
};

/**
 * Creates a test fixture that uses the real toko-api instead of mocks.
 *
 * To use this fixture:
 * 1. Start the toko-api: `cd ../toko-api && make dev` (or `air`)
 * 2. Start the frontend with real API: `NEXT_PUBLIC_API_MOCKING=false NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 pnpm dev`
 * 3. Run tests: `pnpm e2e --project=real-api`
 *
 * Or run all at once with Docker:
 * 1. `cd ../toko-api && docker-compose up -d`
 * 2. `cd ../toko-api && make migrate-up`
 * 3. `cd ../toko-api && air`
 * 4. `NEXT_PUBLIC_API_MOCKING=false NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 pnpm dev`
 * 5. `pnpm e2e --project=real-api`
 */

export const test = base.extend<RealApiFixtures>({
  apiBaseUrl: REAL_API_URL,
  frontendBaseUrl: REAL_FRONTEND_URL,
});

export { expect } from '@playwright/test';
