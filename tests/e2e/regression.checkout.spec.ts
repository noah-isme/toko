import type { Page } from '@playwright/test';

import { selectShipping } from './fixtures';
import { expect, test } from './fixtures/auth.fixture';
import { installRouteWithSettledCleanup, waitForMatchingResponse } from './fixtures/route.fixture';

const DRAFT_ROUTE = '**/api/v1/checkout';
const PAYMENT_INTENT_ROUTE = '**/api/v1/payments/intent';

/**
 * Open checkout with auth + cartId pre-seeded in localStorage so
 * activeCartId is available when addresses and shipping are loaded.
 */
async function openCheckout(page: Page) {
  // Capture console messages to debug if there's any warning/error
  page.on('console', (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // Capture failed requests
  page.on('requestfailed', (request) => {
    console.log(`[Browser Request Failed] ${request.url()} - ${request.failure()?.errorText}`);
  });

  // Log all API responses
  page.on('response', (response) => {
    if (response.url().includes('/api/v1/')) {
      console.log(`[Browser API Response] ${response.url()} status ${response.status()}`);
    }
  });

  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
}

async function chooseQuickAddress(page: Page) {
  // Wait for address radios to appear
  await page.getByRole('radio').first().waitFor({ timeout: 15000 });
  const radios = page.getByRole('radio');
  const count = await radios.count();
  const target = count > 1 ? radios.nth(1) : radios.first();
  await target.click();
  await expect(target).toHaveAttribute('aria-checked', 'true');
}

test.describe('Checkout regressions', () => {
  test('draft + payment flows recover via retry actions', async ({ page }) => {
    await openCheckout(page);
    await chooseQuickAddress(page);
    await selectShipping(page);

    const proceedButton = page.getByRole('button', { name: /Bayar sekarang/i });

    let draftAttempts = 0;
    const cleanupDraftRoute = await installRouteWithSettledCleanup(
      page,
      DRAFT_ROUTE,
      async (route) => {
        draftAttempts += 1;
        if (draftAttempts === 1) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: { message: 'draft failed' } }),
            headers: { 'content-type': 'application/json' },
          });
          return;
        }
        await route.continue();
      },
    );

    await proceedButton.click();
    await expect(page.locator('#main-content').getByText('draft failed')).toBeVisible();
    await expect(proceedButton).toBeEnabled();

    const draftSettled = waitForMatchingResponse(page, '/api/v1/checkout', 'POST');
    await proceedButton.click();
    await cleanupDraftRoute(draftSettled);
    await expect(page).toHaveURL(/\/checkout\/review/);

    let paymentAttempts = 0;
    const cleanupPaymentRoute = await installRouteWithSettledCleanup(
      page,
      PAYMENT_INTENT_ROUTE,
      async (route) => {
        paymentAttempts += 1;
        if (paymentAttempts === 1) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: { message: 'intent error' } }),
            headers: { 'content-type': 'application/json' },
          });
          return;
        }
        await route.continue();
      },
    );

    const payNow = page.getByRole('button', { name: 'Bayar Sekarang' });
    await payNow.click();
    const retryButton = page.getByRole('button', { name: 'Coba lagi' });
    await expect(retryButton).toBeVisible();
    const paymentSettled = waitForMatchingResponse(page, '/payments/intent', 'POST');
    await retryButton.click();
    await cleanupPaymentRoute(paymentSettled);

    const successToast = page.getByRole('status').filter({ hasText: /Pembayaran siap/i });
    await expect(successToast).toBeVisible();

    const confirmPaid = page.getByRole('button', { name: 'Saya Sudah Membayar' });
    await confirmPaid.click();
    await page.waitForURL(/\/checkout\/success/, { timeout: 120_000 });
    await expect(page.getByRole('heading', { name: /Pembayaran Berhasil/i })).toBeVisible();
  });
});
