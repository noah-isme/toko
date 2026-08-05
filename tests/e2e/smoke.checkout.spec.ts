import type { Page } from '@playwright/test';

import { expect, test } from './fixtures/auth.fixture';

const QA_CHANNEL_KEY = '__TOKO_QA_CHANNEL__';

async function dismissCookieDialog(page: Page) {
  const cookieDialog = page.getByRole('dialog', { name: 'We value your privacy' });
  if (await cookieDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole('button', { name: 'Accept All' }).click();
    await expect(cookieDialog).toBeHidden({ timeout: 5000 });
  }
}

async function seedCartFromHome(page: Page) {
  await page.goto('/cart');
  // Try to dismiss cookie consent dialog if present (non-blocking)
  try {
    await page.getByRole('button', { name: 'Accept All' }).click({ timeout: 5000 });
  } catch {
    // Cookie dialog not present or already dismissed
  }
  await expect(page.getByRole('heading', { name: 'Keranjang Belanja' })).toBeVisible({ timeout: 15000 });
}

async function goToCheckout(page: Page) {
  const proceedLink = page.getByRole('link', { name: 'Lanjut ke Pembayaran' });
  await proceedLink.click();
  await expect(page).toHaveURL(/\/checkout/);
  await dismissCookieDialog(page);
}

async function pickQuickAddress(page: Page) {
  const quickPick = page.getByRole('radio').first();
  await expect(quickPick).toBeVisible();
  const name = (await quickPick.locator('p').first().textContent())?.trim() ?? 'Alamat';
  await quickPick.click();
  await expect(quickPick).toHaveAttribute('aria-checked', 'true');
  return name;
}

async function selectShipping(page: Page) {
  const shippingSection = page.getByRole('heading', { name: 'Shipping Options' });
  await shippingSection.waitFor();
  const shippingRadio = page.locator('input[name="shipping-option"]').first();
  await shippingRadio.check({ force: true });
  const label = await shippingRadio.locator('xpath=parent::label').textContent();
  return label?.trim() ?? 'Shipping option';
}

async function applyPromo(page: Page, code: string) {
  const promoInput = page.getByLabel('Masukkan kode');
  await promoInput.fill(code);
  await page.getByRole('button', { name: 'Terapkan' }).click();
  await page.getByText(new RegExp(`Kode ${code.toUpperCase()} aktif`, 'i')).waitFor();
}

async function proceedToReview(page: Page) {
  const proceedButton = page.getByRole('button', { name: /Bayar sekarang/i });
  await expect(proceedButton).toBeEnabled({ timeout: 15_000 });
  await proceedButton.click();
  await expect(page).toHaveURL(/\/checkout\/review/);
}

async function completePaymentFlow(page: Page) {
  const payNow = page.getByRole('button', { name: 'Bayar Sekarang' });
  await expect(payNow).toBeEnabled();
  await payNow.click();
  const confirmPaid = page.getByRole('button', { name: 'Saya Sudah Membayar' });
  await confirmPaid.waitFor();
  await confirmPaid.click();
  await page.waitForURL(/\/checkout\/success/, { timeout: 120_000 });
}

async function waitForTelemetryEvent(page: Page, eventName: string) {
  await page.waitForFunction(
    ({ key, name }: { key: string; name: string }) => {
      const channel = (window as any)[key];
      return Boolean(channel?.telemetry?.some((entry: any) => entry.event === name));
    },
    { key: QA_CHANNEL_KEY, name: eventName } as { key: string; name: string },
  );
}

async function waitForBreadcrumb(page: Page, category: string) {
  await page.waitForFunction(
    ({ key, target }: { key: string; target: string }) => {
      const channel = (window as any)[key];
      return Boolean(channel?.breadcrumbs?.some((crumb: any) => crumb.category === target));
    },
    { key: QA_CHANNEL_KEY, category } as unknown as { key: string; target: string },
  );
}

async function getQAEntries<T extends 'telemetry' | 'breadcrumbs'>(page: Page, key: T) {
  return page.evaluate(
    ({ channelKey, bucket }: { channelKey: string; bucket: string }) => {
      const channel = (window as any)[channelKey];
      return (channel?.[bucket] as unknown[]) ?? [];
    },
    { channelKey: QA_CHANNEL_KEY, bucket: key as string },
  );
}

test.describe('Checkout smoke', () => {
  test('guest can checkout with promo and reach success page', async ({ page }) => {
    await seedCartFromHome(page);
    await goToCheckout(page);

    await pickQuickAddress(page);
    await selectShipping(page);
    await applyPromo(page, 'SAVE10');

    await proceedToReview(page);
    await completePaymentFlow(page);

    await expect(page.getByRole('heading', { name: /Pembayaran Berhasil/i })).toBeVisible();
  });
});
