import type { Page } from '@playwright/test';

import { expect, test } from './fixtures/auth.fixture';
import { installRouteWithSettledCleanup, waitForMatchingResponse } from './fixtures/route.fixture';

const CART_ITEM_ROUTE = '**/api/v1/carts/*/items/**';

async function openCart(page: Page) {
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Shopping cart' })).toBeVisible();
}

test.describe('Cart regressions', () => {
  test('optimistic quantity controls guard in-flight updates', async ({ page }) => {
    await openCart(page);
    const firstItem = page.locator('ul li').first();
    const quantity = firstItem.locator('span[aria-live="polite"]:not(button *)');
    const increment = firstItem.getByRole('button', { name: 'Tambah jumlah' });

    const before = parseInt((await quantity.innerText()).trim(), 10);

    // Intercept PATCH and hold it — optimistic update should show before response
    let resolveHold!: () => void;
    const hold = new Promise<void>((res) => {
      resolveHold = res;
    });
    let intercepted = false;

    const cleanupRoute = await installRouteWithSettledCleanup(
      page,
      CART_ITEM_ROUTE,
      async (route) => {
        if (!intercepted && route.request().method() === 'PATCH') {
          intercepted = true;
          await hold; // Hold until optimistic update is asserted
          await route.continue();
          return;
        }
        await route.continue();
      },
    );

    const responseSettled = waitForMatchingResponse(page, '/items/', 'PATCH');
    await increment.click();
    // Optimistic update should fire immediately (React Query onMutate)
    await expect(quantity).toHaveText(String(before + 1));
    resolveHold(); // Release the held PATCH request
    await cleanupRoute(responseSettled);
  });

  test('remove rollback restores item when API fails', async ({ page }) => {
    await openCart(page);
    const firstItem = page.locator('ul li').first();
    const itemName = (await firstItem.locator('p').first().innerText())?.trim() ?? 'Item';
    const removeButton = firstItem.getByRole('button', { name: 'Hapus' });

    const cleanupRoute = await installRouteWithSettledCleanup(
      page,
      CART_ITEM_ROUTE,
      async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ message: 'test failure' }),
            headers: { 'content-type': 'application/json' },
          });
          return;
        }
        await route.continue();
      },
    );

    const responseSettled = waitForMatchingResponse(page, '/items/', 'DELETE');
    await removeButton.click();
    const toast = page.getByRole('status').filter({ hasText: /Gagal menghapus item/i });
    await expect(toast).toBeVisible();
    const restoredRow = page.locator('ul li').filter({ hasText: itemName }).first();
    await expect(restoredRow).toBeVisible();
    await cleanupRoute(responseSettled);
  });
});
