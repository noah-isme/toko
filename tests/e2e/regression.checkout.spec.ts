import { expect, test, type Page } from '@playwright/test';

const DRAFT_ROUTE = '**/checkout/draft';
const PAYMENT_INTENT_ROUTE = '**/payments/intent';

async function openCheckout(page: Page) {
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
}

async function chooseQuickAddress(page: Page) {
  const radios = page.getByRole('radio');
  const count = await radios.count();
  const target = count > 1 ? radios.nth(1) : radios.first();
  await target.click();
  const announcement = page.locator('p.sr-only').filter({ hasText: /Alamat/ });
  await expect(announcement.first()).toContainText(/dipilih/i);
}

test.describe('Checkout regressions', () => {
  test('draft + payment flows recover via retry actions', async ({ page }) => {
    await openCheckout(page);
    await chooseQuickAddress(page);

    const proceedButton = page.getByRole('button', { name: /Proceed to pay/i });

    let draftAttempts = 0;
    await page.route(DRAFT_ROUTE, async (route) => {
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
    });

    await proceedButton.click();
    const draftErrorToast = page.getByRole('status').filter({ hasText: /Gagal membuat draft pesanan/i });
    await expect(draftErrorToast).toBeVisible();
    await expect(proceedButton).toBeEnabled();

    await proceedButton.click();
    await page.unroute(DRAFT_ROUTE);
    await expect(page).toHaveURL(/\/checkout\/review/);

    let paymentAttempts = 0;
    await page.route(PAYMENT_INTENT_ROUTE, async (route) => {
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
    });

    const payNow = page.getByRole('button', { name: 'Bayar Sekarang' });
    await payNow.click();
    const retryButton = page.getByRole('button', { name: 'Coba lagi' });
    await expect(retryButton).toBeVisible();
    await retryButton.click();
    await page.unroute(PAYMENT_INTENT_ROUTE);

    const successToast = page.getByRole('status').filter({ hasText: /Pembayaran siap/i });
    await expect(successToast).toBeVisible();

    const confirmPaid = page.getByRole('button', { name: 'Saya Sudah Membayar' });
    await confirmPaid.click();
    await page.waitForURL(/\/checkout\/success/, { timeout: 120_000 });
    await expect(page.getByRole('heading', { name: /Pembayaran Berhasil/i })).toBeVisible();
  });
});
