import { expect, test, type Page } from '@playwright/test';

import { installAdminSession } from './fixtures/auth.fixture';

/**
 * Every admin page shows the shared AdminLoading state while its data is
 * pending and AdminError with a working retry when the admin API fails.
 *
 * Selectors are `data-testid` only, so the spec survives the admin
 * translation. Pages whose endpoints the mock API serves must recover after
 * retry; the rest (404 in mock mode, see plan amendment M11) only have to
 * issue a fresh request when retry is clicked.
 */
const ADMIN_API = '**/api/v1/admin/**';

const RECOVERABLE_PAGES = [
  '/admin',
  '/admin/analytics',
  '/admin/brands',
  '/admin/categories',
  '/admin/orders',
  '/admin/products',
  '/admin/products/new',
];

const ERROR_ONLY_PAGES = [
  '/admin/audit-logs',
  '/admin/customers',
  '/admin/flash-sales',
  '/admin/flash-sales/new',
  '/admin/flash-sales/missing-id/edit',
  '/admin/inventory',
  '/admin/products/missing-id/edit',
  '/admin/returns',
  '/admin/settings',
  '/admin/support',
  '/admin/vouchers',
  '/admin/webhooks',
];

/**
 * Holds admin API calls until released, then aborts them while `failing` is
 * set. Returns controls plus a counter of intercepted requests.
 */
async function controlAdminApi(page: Page) {
  const state = { failing: true, requests: 0 };
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(ADMIN_API, async (route) => {
    state.requests += 1;
    await gate;
    if (state.failing) {
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
  return { state, release };
}

async function expectLoadingThenError(page: Page, path: string) {
  const api = await controlAdminApi(page);
  await page.goto(path);
  await expect(page.getByTestId('admin-loading').first()).toBeVisible();
  api.release();
  await expect(page.getByTestId('admin-error').first()).toBeVisible();
  return api;
}

test.describe('admin loading and error states', () => {
  test.beforeEach(async ({ page }) => {
    await installAdminSession(page);
  });

  for (const path of RECOVERABLE_PAGES) {
    test(`${path} shows loading, then error, and recovers on retry`, async ({ page }) => {
      const api = await expectLoadingThenError(page, path);
      api.state.failing = false;
      for (const retry of await page.getByTestId('admin-error-retry').all()) {
        await retry.click();
      }
      await expect(page.getByTestId('admin-error')).toHaveCount(0);
    });
  }

  for (const path of ERROR_ONLY_PAGES) {
    test(`${path} shows loading, then error, and retry refetches`, async ({ page }) => {
      const api = await expectLoadingThenError(page, path);
      const before = api.state.requests;
      await page.getByTestId('admin-error-retry').first().click();
      await expect.poll(() => api.state.requests).toBeGreaterThan(before);
      await expect(page.getByTestId('admin-error').first()).toBeVisible();
    });
  }
});
