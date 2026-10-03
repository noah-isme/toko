import { defineConfig, devices } from '@playwright/test';

// Production-mode E2E for the service worker (ADR-009), run via `pnpm e2e:prod`.
// The default `pnpm e2e` runs against `pnpm dev`, where the service worker is
// not registered, so it never exercises /serwist/sw.js. This config builds and
// serves the mock production pair instead (build:mock + start:mock) and lets
// service workers run.
const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/pwa.spec.ts',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium-prod',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm build:mock && pnpm start:mock',
    url: BASE_URL,
    // A cold Turbopack production build plus server start.
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
  },
});
