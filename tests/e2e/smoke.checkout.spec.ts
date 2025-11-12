import { expect, test, type Page } from '@playwright/test';

const QA_CHANNEL_KEY = '__TOKO_QA_CHANNEL__';

async function seedCartFromHome(page: Page) {
  await page.goto('/');
  const addButton = page.getByRole('button', { name: /Add to cart/i }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();
}

async function goToCheckout(page: Page) {
  const cartLink = page.getByRole('link', { name: 'Cart' });
  await cartLink.click();
  await expect(page).toHaveURL(/\/cart$/);
  const proceedLink = page.getByRole('link', { name: 'Proceed to checkout' });
  await proceedLink.click();
  await expect(page).toHaveURL(/\/checkout/);
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
  const proceedButton = page.getByRole('button', { name: /Proceed to pay/i });
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
    ([key, name]) => {
      const channel = (window as typeof window & { [QA_CHANNEL_KEY]?: { telemetry?: Array<{ event: string }> } })[key];
      return Boolean(channel?.telemetry?.some((entry) => entry.event === name));
    },
    [QA_CHANNEL_KEY, eventName],
  );
}

async function waitForBreadcrumb(page: Page, category: string) {
  await page.waitForFunction(
    ([key, target]) => {
      const channel = (window as typeof window & { [QA_CHANNEL_KEY]?: { breadcrumbs?: Array<{ category?: string }> } })[key];
      return Boolean(channel?.breadcrumbs?.some((crumb) => crumb.category === target));
    },
    [QA_CHANNEL_KEY, category],
  );
}

async function getQAEntries<T extends 'telemetry' | 'breadcrumbs'>(page: Page, key: T) {
  return page.evaluate(
    ([channelKey, bucket]) => {
      const channel = (window as typeof window & { [QA_CHANNEL_KEY]?: Record<T, unknown[]> })[channelKey];
      return (channel?.[bucket] as unknown[]) ?? [];
    },
    [QA_CHANNEL_KEY, key],
  );
}

test.describe('Checkout smoke', () => {
  test('guest can checkout with promo and reach success page', async ({ page }) => {
    await seedCartFromHome(page);
    await goToCheckout(page);

    const addressName = await pickQuickAddress(page);
    await waitForTelemetryEvent(page, 'checkout_address_select');

    await selectShipping(page);
    await applyPromo(page, 'SAVE10');
    await waitForTelemetryEvent(page, 'promo_apply');

    await proceedToReview(page);
    await completePaymentFlow(page);

    await expect(page.getByRole('heading', { name: /Pembayaran Berhasil/i })).toBeVisible();
    const announcement = page.locator('p.sr-only').filter({ hasText: /Alamat/ });
    await expect(announcement.first()).toContainText(new RegExp(addressName.slice(0, 3), 'i'));

    await waitForBreadcrumb(page, 'promo');
    const telemetry = await getQAEntries(page, 'telemetry');
    expect(telemetry.some((entry) => (entry as { event?: string }).event === 'checkout_address_select')).toBe(true);
    const breadcrumbs = await getQAEntries(page, 'breadcrumbs');
    expect(breadcrumbs.some((crumb) => (crumb as { category?: string }).category === 'promo')).toBe(true);
  });
});
