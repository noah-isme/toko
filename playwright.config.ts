import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
// Default to internal mock router for E2E tests
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'mock';
// Deliberately 'false' regardless of the caller. With NEXT_PUBLIC_API_URL='mock'
// the app routes through the internal Next handler at src/app/api/v1/[[...path]],
// which is what these specs are written against. Turning MSW on as well swaps in
// a second, less complete mock layer and the suite fails.
const API_MOCKING = 'false';

export default defineConfig({
  testDir: 'tests/e2e',
  // Real API specs require a live toko-api on :8080 and have their own
  // config (playwright.real-api.config.ts). Running them here — against mocks,
  // once per project — would fail by construction.
  testIgnore: '**/*real-api.spec.ts',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    // The development push worker handles API fetches before Playwright can
    // apply per-test route mocks. Block it so mock E2E tests exercise the
    // responses declared by each spec instead of a service-worker cache.
    serviceWorkers: 'block',
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-visual',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'on',
      },
    },
    {
      name: 'chromium-real-api',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'on',
      },
    },
    {
      name: 'mobile-chrome-visual',
      use: {
        ...devices['Pixel 5'],
        screenshot: 'on',
      },
    },
    {
      name: 'mobile-safari-visual',
      use: {
        ...devices['iPhone 12'],
        screenshot: 'on',
      },
    },
    {
      name: 'tablet-visual',
      use: {
        ...devices['iPad Pro'],
        screenshot: 'on',
      },
    },
  ],
  // Always own the app under test. Without this, a local `pnpm e2e` assumed a
  // manually started server and every spec failed with ERR_CONNECTION_REFUSED.
  // Outside CI an already-running server on the port is reused.
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_API_MOCKING: API_MOCKING,
      NEXT_PUBLIC_API_URL: API_URL,
    },
  },
});
