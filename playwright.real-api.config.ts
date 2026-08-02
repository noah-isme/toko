import { defineConfig, devices } from '@playwright/test';

// Configuration for running visual tests against the real toko-api
// Usage: npx playwright test -c playwright.real-api.config.ts

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*real-api.spec.ts',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      maxDiffPixels: 1000,
      threshold: 0.2,
    },
  },
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'test-results/html-report-real-api' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on-first-retry',
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium-real-api',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'on',
      },
    },
    {
      name: 'mobile-chrome-real-api',
      use: {
        ...devices['Pixel 5'],
        screenshot: 'on',
      },
    },
    {
      name: 'tablet-real-api',
      use: {
        ...devices['iPad Pro'],
        screenshot: 'on',
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: true,
    env: {
      NEXT_PUBLIC_API_MOCKING: 'false',
      NEXT_PUBLIC_API_URL: API_URL,
    },
  },
});
