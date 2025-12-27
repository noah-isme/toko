import { expect, type Page, type Route } from '@playwright/test';

// ============================================================================
// Cart Helpers
// ============================================================================

/**
 * Add products to cart from the homepage
 */
export async function seedCartFromHome(page: Page, count = 1) {
  await page.goto('/');
  const addButtons = page.getByRole('button', { name: /Add to cart/i });

  for (let i = 0; i < count; i++) {
    const button = addButtons.nth(i);
    await expect(button).toBeVisible();
    await button.click();
    // Wait for cart update
    await page.waitForTimeout(300);
  }
}

/**
 * Navigate from cart to checkout
 */
export async function navigateToCheckout(page: Page) {
  const cartLink = page.getByRole('link', { name: 'Cart' });
  await cartLink.click();
  await expect(page).toHaveURL(/\/cart$/);

  const proceedLink = page.getByRole('link', { name: 'Proceed to checkout' });
  await proceedLink.click();
  await expect(page).toHaveURL(/\/checkout/);
}

/**
 * Open checkout page directly
 */
export async function openCheckout(page: Page) {
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
}

// ============================================================================
// Address Helpers
// ============================================================================

/**
 * Select an address from the quick pick list
 * @returns The name of the selected address
 */
export async function selectAddress(page: Page, index = 0): Promise<string> {
  const radios = page.getByRole('radio');
  const count = await radios.count();
  const target = count > index ? radios.nth(index) : radios.first();

  await expect(target).toBeVisible();
  const name = (await target.locator('p').first().textContent())?.trim() ?? 'Alamat';
  await target.click();
  await expect(target).toHaveAttribute('aria-checked', 'true');

  return name;
}

/**
 * Wait for address selection announcement (accessibility)
 */
export async function waitForAddressAnnouncement(page: Page, partialName?: string) {
  const announcement = page.locator('p.sr-only').filter({ hasText: /Alamat/ });
  await expect(announcement.first()).toContainText(/dipilih/i);

  if (partialName) {
    await expect(announcement.first()).toContainText(new RegExp(partialName.slice(0, 3), 'i'));
  }
}

/**
 * Open the address manager dialog
 */
export async function openAddressDialog(page: Page) {
  const manageButton = page.getByRole('button', { name: /Kelola Alamat|Manage Address/i });
  await manageButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

// ============================================================================
// Shipping Helpers
// ============================================================================

/**
 * Select a shipping option
 * @returns The label of the selected shipping option
 */
export async function selectShipping(page: Page, index = 0): Promise<string> {
  const shippingSection = page.getByRole('heading', { name: 'Shipping Options' });
  await shippingSection.waitFor();

  const shippingRadios = page.locator('input[name="shipping-option"]');
  const target = shippingRadios.nth(index);
  await target.check({ force: true });

  const label = await target.locator('xpath=parent::label').textContent();
  return label?.trim() ?? 'Shipping option';
}

// ============================================================================
// Promo Helpers
// ============================================================================

/**
 * Apply a promo code
 */
export async function applyPromo(page: Page, code: string) {
  const promoInput = page.getByLabel('Masukkan kode');
  await promoInput.fill(code);
  await page.getByRole('button', { name: 'Terapkan' }).click();
  await page.getByText(new RegExp(`Kode ${code.toUpperCase()} aktif`, 'i')).waitFor();
}

// ============================================================================
// Checkout Flow Helpers
// ============================================================================

/**
 * Proceed from checkout to review page
 */
export async function proceedToReview(page: Page) {
  const proceedButton = page.getByRole('button', { name: /Proceed to pay/i });
  await expect(proceedButton).toBeEnabled({ timeout: 15_000 });
  await proceedButton.click();
  await expect(page).toHaveURL(/\/checkout\/review/);
}

/**
 * Complete the payment flow on review page
 */
export async function completePayment(page: Page) {
  const payNow = page.getByRole('button', { name: 'Bayar Sekarang' });
  await expect(payNow).toBeEnabled();
  await payNow.click();

  const confirmPaid = page.getByRole('button', { name: 'Saya Sudah Membayar' });
  await confirmPaid.waitFor();
  await confirmPaid.click();

  await page.waitForURL(/\/checkout\/success/, { timeout: 120_000 });
}

/**
 * Verify successful checkout completion
 */
export async function verifyCheckoutSuccess(page: Page) {
  await expect(page.getByRole('heading', { name: /Pembayaran Berhasil/i })).toBeVisible();
}

// ============================================================================
// Order Helpers
// ============================================================================

/**
 * Navigate to order history page
 */
export async function goToOrderHistory(page: Page) {
  await page.goto('/account/orders');
  await expect(page.getByRole('heading', { name: 'Pesanan Saya' })).toBeVisible();
}

/**
 * Navigate to order confirmation page
 */
export async function goToOrderConfirmation(page: Page, orderId: string) {
  await page.goto(`/order/confirmation/${orderId}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Get order status from order card
 */
export async function getOrderStatus(page: Page, orderNumber: string): Promise<string> {
  const orderCard = page.locator('div').filter({ hasText: orderNumber }).first();
  const statusBadge = orderCard.locator('span.rounded-full');
  return (await statusBadge.textContent())?.trim() ?? '';
}

// ============================================================================
// API Mocking Helpers
// ============================================================================

interface MockApiOptions {
  status?: number;
  delay?: number;
  failOnAttempt?: number;
}

/**
 * Mock an API response
 */
export async function mockApiResponse(
  page: Page,
  routePattern: string,
  responseBody: unknown,
  options: MockApiOptions = {},
) {
  const { status = 200, delay = 0, failOnAttempt } = options;
  let attempts = 0;

  await page.route(routePattern, async (route: Route) => {
    attempts += 1;

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (failOnAttempt && attempts === failOnAttempt) {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: { message: 'Simulated failure' } }),
        headers: { 'content-type': 'application/json' },
      });
      return;
    }

    await route.fulfill({
      status,
      body: JSON.stringify(responseBody),
      headers: { 'content-type': 'application/json' },
    });
  });
}

/**
 * Mock order API response
 */
export async function mockOrderResponse(
  page: Page,
  orderId: string,
  orderData: Partial<MockOrderData>,
) {
  const defaultOrder: MockOrderData = {
    id: orderId,
    orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
    status: 'paid',
    total: 150000,
    currency: 'IDR',
    itemCount: 1,
    createdAt: new Date().toISOString(),
    pricing: { total: 150000 },
    payment: null,
  };

  const order = { ...defaultOrder, ...orderData };

  await page.route(`**/orders/${orderId}`, async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ data: order }),
      headers: { 'content-type': 'application/json' },
    });
  });
}

interface MockOrderData {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  pricing: { total: number };
  payment: { paymentUrl?: string; paymentExpiry?: string } | null;
}

/**
 * Mock orders list API response
 */
export async function mockOrdersListResponse(page: Page, orders: Partial<MockOrderData>[]) {
  const fullOrders = orders.map((order, index) => ({
    id: order.id ?? `order-${index}`,
    orderNumber: order.orderNumber ?? `ORD-${String(index).padStart(6, '0')}`,
    status: order.status ?? 'paid',
    total: order.total ?? 100000,
    currency: order.currency ?? 'IDR',
    itemCount: order.itemCount ?? 1,
    createdAt: order.createdAt ?? new Date().toISOString(),
    ...order,
  }));

  await page.route('**/orders*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: fullOrders, meta: { total: fullOrders.length } }),
        headers: { 'content-type': 'application/json' },
      });
    } else {
      await route.continue();
    }
  });
}

// ============================================================================
// Telemetry Helpers (QA Channel)
// ============================================================================

const QA_CHANNEL_KEY = '__TOKO_QA_CHANNEL__';

type QAChannelWindow = typeof window & {
  [QA_CHANNEL_KEY]?: {
    telemetry?: Array<{ event: string }>;
    breadcrumbs?: Array<{ category?: string }>;
  };
};

/**
 * Wait for a telemetry event to be recorded
 */
export async function waitForTelemetryEvent(page: Page, eventName: string) {
  await page.waitForFunction(
    ([key, name]) => {
      const channel = (window as QAChannelWindow)[key as typeof QA_CHANNEL_KEY];
      return Boolean(channel?.telemetry?.some((entry) => entry.event === name));
    },
    [QA_CHANNEL_KEY, eventName],
  );
}

/**
 * Wait for a breadcrumb to be recorded
 */
export async function waitForBreadcrumb(page: Page, category: string) {
  await page.waitForFunction(
    ([key, target]) => {
      const channel = (window as QAChannelWindow)[key as typeof QA_CHANNEL_KEY];
      return Boolean(channel?.breadcrumbs?.some((crumb) => crumb.category === target));
    },
    [QA_CHANNEL_KEY, category],
  );
}

/**
 * Get QA channel entries
 */
export async function getQAEntries<T extends 'telemetry' | 'breadcrumbs'>(page: Page, key: T) {
  return page.evaluate(
    ([channelKey, bucket]) => {
      const channel = (window as QAChannelWindow)[channelKey as typeof QA_CHANNEL_KEY];
      return (channel?.[bucket as T] as unknown[]) ?? [];
    },
    [QA_CHANNEL_KEY, key],
  );
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Verify toast notification is visible
 */
export async function expectToast(page: Page, messagePattern: RegExp) {
  const toast = page.getByRole('status').filter({ hasText: messagePattern });
  await expect(toast).toBeVisible();
}

/**
 * Verify button is disabled with hint
 */
export async function expectDisabledButton(page: Page, buttonName: string | RegExp) {
  const button = page.getByRole('button', { name: buttonName });
  await expect(button).toBeDisabled();
}
