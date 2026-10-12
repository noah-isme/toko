import { expect, test, type Page } from '@playwright/test';

import { installIsolatedAdminSession } from './fixtures/admin-session';

/**
 * Admin product CRUD against the mock API (per-session store seeded from
 * src/mocks/fixtures). Selectors are `data-testid` or label `for` IDs only, so
 * the spec survives the admin translation (plan amendment M3). Product titles
 * below are test data, not UI copy.
 */

const rows = (page: Page) => page.getByTestId('admin-product-row');
const rowById = (page: Page, id: string) =>
  page.locator(`[data-testid="admin-product-row"][data-product-id="${id}"]`);
const rowTitles = (page: Page) => page.getByTestId('admin-product-title');

async function openProductList(page: Page) {
  await page.goto('/admin/products');
  await expect(rows(page).first()).toBeVisible();
}

test.describe('admin products', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await installIsolatedAdminSession(page, testInfo);
  });

  test('creates a product that then appears in the list', async ({ page }) => {
    const title = `E2E Product ${Date.now()}`;
    await openProductList(page);
    const seededCount = await rows(page).count();
    expect(seededCount).toBeGreaterThan(0);

    await page.getByTestId('admin-product-new').click();
    await expect(page).toHaveURL(/\/admin\/products\/new$/);
    await page.locator('#product-title').fill(title);
    await page.locator('#product-price').fill('125000');
    await page.getByTestId('product-form-submit').click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(rowTitles(page).filter({ hasText: title })).toHaveCount(1);

    await page.reload();
    await expect(rowTitles(page).filter({ hasText: title })).toHaveCount(1);
  });

  test('edits a seeded product title and persists it', async ({ page }) => {
    const title = `E2E Renamed ${Date.now()}`;
    await openProductList(page);
    const productId = await rows(page).first().getAttribute('data-product-id');
    expect(productId).toBeTruthy();
    const row = rowById(page, productId!);

    await row.getByTestId('admin-product-edit').click();
    await expect(page).toHaveURL(new RegExp(`/admin/products/${productId}/edit$`));
    const titleInput = page.locator('#product-title');
    await expect(titleInput).not.toHaveValue('');
    await titleInput.fill(title);
    await page.getByTestId('product-form-submit').click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(row.getByTestId('admin-product-title')).toHaveText(title);

    await page.reload();
    await expect(row.getByTestId('admin-product-title')).toHaveText(title);
    await page.goto(`/admin/products/${productId}/edit`);
    await expect(page.locator('#product-title')).toHaveValue(title);
  });

  test('deletes a seeded product so it is gone from the list', async ({ page }) => {
    await openProductList(page);
    const productId = await rows(page).first().getAttribute('data-product-id');
    expect(productId).toBeTruthy();
    const row = rowById(page, productId!);

    await row.getByTestId('admin-product-delete').click();
    await page.getByTestId('admin-product-delete-confirm').click();

    await expect(row).toHaveCount(0);
    await expect(rows(page).first()).toBeVisible();

    await page.reload();
    await expect(rows(page).first()).toBeVisible();
    await expect(row).toHaveCount(0);
  });
});
