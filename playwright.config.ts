import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
// For real API testing, use the actual API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
// Deliberately 'false' regardless of the caller. With NEXT_PUBLIC_API_URL='mock'
// the app routes through the internal Next handler at src/app/api/v1/[[...path]],
// which is what these specs are written against. Turning MSW on as well swaps in
// a second, less complete mock layer and the suite fails.
const API_MOCKING = 'false';

export default defineConfig({
  testDir: 'tests/e2e',
  // visual-real-api.spec.ts requires a live toko-api on :8080 and has its own
  // config (playwright.real-api.config.ts). Running it here — against mocks,
  // once per project — would fail by construction.
  testIgnore: '**/visual-real-api.spec.ts',
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
  webServer: process.env.CI
    ? {
        command: 'pnpm dev',
        url: BASE_URL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
        env: {
          NEXT_PUBLIC_API_MOCKING: API_MOCKING,
          NEXT_PUBLIC_API_URL: API_URL,
        },
      }
    : undefined,
});
