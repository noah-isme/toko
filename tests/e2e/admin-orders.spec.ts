import { expect, test, type Page } from '@playwright/test';

import { installIsolatedAdminSession } from './fixtures/admin-session';

/**
 * Admin order status change against the mock API (per-session store seeded
 * from src/mocks/fixtures). Selectors are `data-testid` plus the badge's
 * `data-status` attribute, never UI copy (plan amendment M3).
 */

const statusBadge = (status: string) =>
  `[data-testid="order-status-badge"][data-status="${status}"]`;
const rowById = (page: Page, id: string) =>
  page.locator(`[data-testid="admin-order-row"][data-order-id="${id}"]`);

test.describe('admin orders', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await installIsolatedAdminSession(page, testInfo);
  });

  test('advances a paid order to packed and persists it', async ({ page }) => {
    await page.goto('/admin/orders');
    const paidRow = page
      .getByTestId('admin-order-row')
      .filter({ has: page.locator(statusBadge('PAID')) })
      .first();
    await expect(paidRow).toBeVisible();
    const orderId = await paidRow.getAttribute('data-order-id');
    expect(orderId).toBeTruthy();
    const row = rowById(page, orderId!);

    await row.getByTestId('admin-order-status-select').click();
    // PAID -> PACKED is the next allowed transition (see allowedTargets()).
    await page.getByTestId('admin-order-status-option-PACKED').click();

    const badge = row.getByTestId('order-status-badge');
    await expect(badge).toHaveAttribute('data-status', 'PACKED');

    await page.reload();
    await expect(badge).toHaveAttribute('data-status', 'PACKED');
  });
});
