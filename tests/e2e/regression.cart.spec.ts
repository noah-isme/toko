import { expect, test, type Page } from '@playwright/test';

const CART_ITEM_ROUTE = '**/cart/items/**';

async function openCart(page: Page) {
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Shopping cart' })).toBeVisible();
}

test.describe('Cart regressions', () => {
  test('optimistic quantity controls guard in-flight updates', async ({ page }) => {
    await openCart(page);
    const firstItem = page.locator('ul li').first();
    const quantity = firstItem.locator('[aria-live="polite"]').first();
    const increment = firstItem.getByRole('button', { name: 'Tambah jumlah' });
    const decrement = firstItem.getByRole('button', { name: 'Kurangi jumlah' });

    const before = parseInt((await quantity.innerText()).trim(), 10);
    let intercepted = false;

    await page.route(CART_ITEM_ROUTE, async (route) => {
      if (!intercepted && route.request().method() === 'PATCH') {
        intercepted = true;
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      await route.continue();
    });

    await increment.click();
    await expect(increment).toBeDisabled();
    await expect(decrement).toBeDisabled();
    await expect(quantity).toHaveText(String(before + 1));
    await page.unroute(CART_ITEM_ROUTE);
  });

  test('remove rollback restores item when API fails', async ({ page }) => {
    await openCart(page);
    const firstItem = page.locator('ul li').first();
    const itemName = (await firstItem.locator('p').first().innerText())?.trim() ?? 'Item';
    const removeButton = firstItem.getByRole('button', { name: 'Hapus' });

    await page.route(CART_ITEM_ROUTE, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ message: 'test failure' }),
          headers: { 'content-type': 'application/json' },
        });
        return;
      }
      await route.continue();
    });

    await removeButton.click();
    const toast = page.getByRole('status').filter({ hasText: /Gagal menghapus item/i });
    await expect(toast).toBeVisible();
    const restoredRow = page.locator('ul li').filter({ hasText: itemName }).first();
    await expect(restoredRow).toBeVisible();
    await page.unroute(CART_ITEM_ROUTE);
  });
});
