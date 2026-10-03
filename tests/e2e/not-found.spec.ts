import { expect, test } from '@playwright/test';

import { installAdminSession } from './fixtures/auth.fixture';

const notFoundHeading = { name: 'Halaman tidak ditemukan' };

test.describe('not-found pages', () => {
  test('an unmatched URL returns 404 and shows the root not-found page', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', notFoundHeading)).toBeVisible();
  });

  test('an unmatched admin URL shows the root not-found page', async ({ page }) => {
    await installAdminSession(page);
    const response = await page.goto('/admin/nope');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', notFoundHeading)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kembali ke beranda' })).toBeVisible();
  });

  test('a missing admin product renders the admin not-found inside the admin shell', async ({
    page,
  }) => {
    await installAdminSession(page);
    await page.goto('/admin/products/does-not-exist/edit');
    await expect(page.getByRole('heading', notFoundHeading)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kembali ke dasbor admin' })).toBeVisible();
    // Admin shell (sidebar brand) is still around the not-found view.
    await expect(page.getByRole('link', { name: 'toko admin' }).first()).toBeVisible();
  });
});
