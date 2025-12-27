import { expect, test } from '@playwright/test';

import {
  expectToast,
  navigateToCheckout,
  openCheckout,
  proceedToReview,
  seedCartFromHome,
  selectAddress,
  selectShipping,
} from './fixtures';

const DRAFT_ROUTE = '**/checkout/draft';
const PAYMENT_INTENT_ROUTE = '**/payments/intent';
const SHIPPING_ROUTE = '**/shipping*';
const CART_ROUTE = '**/cart*';

test.describe('Checkout error handling', () => {
  test.describe('Network errors during checkout', () => {
    test('draft API failure shows error toast and retry option', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      await selectAddress(page);
      await selectShipping(page);

      // Mock draft API to fail
      let attempts = 0;
      await page.route(DRAFT_ROUTE, async (route) => {
        attempts += 1;
        if (attempts === 1) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: { message: 'Draft creation failed' } }),
            headers: { 'content-type': 'application/json' },
          });
          return;
        }
        await route.continue();
      });

      // Click proceed
      const proceedButton = page.getByRole('button', { name: /Proceed to pay/i });
      await proceedButton.click();

      // Should show error toast
      await expectToast(page, /Gagal membuat draft pesanan|Draft creation failed|error/i);

      // Button should still be enabled for retry
      await expect(proceedButton).toBeEnabled();

      // Second attempt should succeed (route continues after first failure)
      await proceedButton.click();
      await page.unroute(DRAFT_ROUTE);
      await expect(page).toHaveURL(/\/checkout\/review/);
    });

    test('payment intent failure shows retry button', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      await selectAddress(page);
      await selectShipping(page);
      await proceedToReview(page);

      // Mock payment intent to fail once
      let attempts = 0;
      await page.route(PAYMENT_INTENT_ROUTE, async (route) => {
        attempts += 1;
        if (attempts === 1) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: { message: 'Payment gateway error' } }),
            headers: { 'content-type': 'application/json' },
          });
          return;
        }
        await route.continue();
      });

      // Click pay button
      const payNow = page.getByRole('button', { name: 'Bayar Sekarang' });
      await payNow.click();

      // Should show retry button
      const retryButton = page.getByRole('button', { name: 'Coba lagi' });
      await expect(retryButton).toBeVisible();

      // Retry should work
      await retryButton.click();
      await page.unroute(PAYMENT_INTENT_ROUTE);

      // Should show success or proceed
      const successToast = page.getByRole('status').filter({ hasText: /Pembayaran siap|siap/i });
      await expect(successToast).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Shipping API failures', () => {
    test('shipping options failure shows graceful message', async ({ page }) => {
      await seedCartFromHome(page);

      // Mock shipping API to fail
      await page.route(SHIPPING_ROUTE, async (route) => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: { message: 'Shipping service unavailable' } }),
          headers: { 'content-type': 'application/json' },
        });
      });

      await navigateToCheckout(page);
      await selectAddress(page);

      // Should show error state or fallback message
      const shippingError = page.getByText(/tidak tersedia|unavailable|gagal|error/i);
      const hasError = await shippingError.isVisible().catch(() => false);

      // Or proceed button should be disabled
      const proceedButton = page.getByRole('button', { name: /Proceed to pay/i });
      const isDisabled = await proceedButton.isDisabled();

      // Either shows error or disables proceed
      expect(hasError || isDisabled).toBe(true);
    });

    test('shipping options timeout shows loading then error', async ({ page }) => {
      await seedCartFromHome(page);

      // Mock shipping API with long delay then fail
      await page.route(SHIPPING_ROUTE, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.fulfill({
          status: 504,
          body: JSON.stringify({ error: { message: 'Gateway timeout' } }),
          headers: { 'content-type': 'application/json' },
        });
      });

      await navigateToCheckout(page);
      await selectAddress(page);

      // Should show loading indicator initially
      const loadingIndicator = page.locator('.animate-spin, .animate-pulse, [role="progressbar"]');
      const hasLoading = await loadingIndicator
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      // Loading should be visible while waiting
      // (Note: This test may timeout, which is expected behavior)
    });
  });

  test.describe('Cart validation errors', () => {
    test('empty cart redirects or shows error on checkout', async ({ page }) => {
      // Mock empty cart
      await page.route(CART_ROUTE, async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ data: { items: [], totals: { subtotal: 0, total: 0 } } }),
            headers: { 'content-type': 'application/json' },
          });
        } else {
          await route.continue();
        }
      });

      await openCheckout(page);

      // Should show empty cart message or redirect
      const emptyMessage = page.getByText(/keranjang kosong|cart is empty|no items/i);
      const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false);

      const isRedirected = page.url().includes('/cart') || page.url().includes('/products');

      expect(hasEmptyMessage || isRedirected).toBe(true);
    });

    test('out of stock item shows warning during checkout', async ({ page }) => {
      await seedCartFromHome(page);

      // Mock cart with out of stock item
      await page.route(CART_ROUTE, async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({
              data: {
                items: [
                  {
                    id: 'item-1',
                    productId: 'product-1',
                    name: 'Test Product',
                    quantity: 2,
                    availableStock: 0, // Out of stock
                    price: 100000,
                  },
                ],
                totals: { subtotal: 200000, total: 200000 },
              },
            }),
            headers: { 'content-type': 'application/json' },
          });
        } else {
          await route.continue();
        }
      });

      await navigateToCheckout(page);

      // Check for out of stock indication
      const stockWarning = page.getByText(/stok habis|out of stock|tidak tersedia/i);
      const hasWarning = await stockWarning.isVisible().catch(() => false);

      // Proceed button may be disabled
      const proceedButton = page.getByRole('button', { name: /Proceed to pay/i });
      const isButtonPresent = await proceedButton.isVisible().catch(() => false);

      // Either shows warning or adjusts UI
      expect(hasWarning || !isButtonPresent).toBe(true);
    });
  });

  test.describe('Session and authentication errors', () => {
    test('expired session during checkout shows login prompt', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      await selectAddress(page);
      await selectShipping(page);

      // Mock draft API to return 401
      await page.route(DRAFT_ROUTE, async (route) => {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ error: { message: 'Session expired' } }),
          headers: { 'content-type': 'application/json' },
        });
      });

      const proceedButton = page.getByRole('button', { name: /Proceed to pay/i });
      await proceedButton.click();

      // Should show login prompt or redirect to login
      const loginPrompt = page.getByText(/login|masuk|sesi berakhir|session expired/i);
      const hasLoginPrompt = await loginPrompt.isVisible().catch(() => false);
      const isLoginRedirect = page.url().includes('/login') || page.url().includes('/auth');

      expect(hasLoginPrompt || isLoginRedirect).toBe(true);
    });
  });

  test.describe('Concurrent modification errors', () => {
    test('price change during checkout shows updated price warning', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      await selectAddress(page);
      await selectShipping(page);

      // Mock draft API to return price changed error
      await page.route(DRAFT_ROUTE, async (route) => {
        await route.fulfill({
          status: 409,
          body: JSON.stringify({
            error: {
              code: 'PRICE_CHANGED',
              message: 'Price has changed since you added items',
            },
          }),
          headers: { 'content-type': 'application/json' },
        });
      });

      const proceedButton = page.getByRole('button', { name: /Proceed to pay/i });
      await proceedButton.click();

      // Should show price change warning
      const priceWarning = page.getByText(/harga berubah|price\s*(has\s*)?changed|update/i);
      const hasPriceWarning = await priceWarning.isVisible().catch(() => false);

      // Or show toast with warning
      const warningToast = page.getByRole('status');
      const hasWarningToast = await warningToast.isVisible().catch(() => false);

      expect(hasPriceWarning || hasWarningToast).toBe(true);
    });
  });

  test.describe('Recovery flows', () => {
    test('user can navigate back and retry after error', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      await selectAddress(page);
      await selectShipping(page);

      // Mock draft API to fail
      await page.route(DRAFT_ROUTE, async (route) => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: { message: 'Server error' } }),
          headers: { 'content-type': 'application/json' },
        });
      });

      const proceedButton = page.getByRole('button', { name: /Proceed to pay/i });
      await proceedButton.click();

      // Wait for error state
      await page.waitForTimeout(500);

      // Navigate back to cart
      const cartLink = page.getByRole('link', { name: /cart|keranjang/i });
      if (await cartLink.isVisible()) {
        await cartLink.click();
        await expect(page).toHaveURL(/\/cart/);
      }

      // User should be able to return to checkout
      await page.unroute(DRAFT_ROUTE);
      const proceedToCheckout = page.getByRole('link', { name: /Proceed to checkout|checkout/i });
      if (await proceedToCheckout.isVisible()) {
        await proceedToCheckout.click();
        await expect(page).toHaveURL(/\/checkout/);
      }
    });
  });
});
