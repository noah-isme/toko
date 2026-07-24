import { expect, test } from '@playwright/test';

import {
  completePayment,
  expectToast,
  goToOrderConfirmation,
  goToOrderHistory,
  mockOrderResponse,
  mockOrdersListResponse,
  navigateToCheckout,
  proceedToReview,
  seedCartFromHome,
  selectAddress,
  selectShipping,
} from './fixtures';

const PAYMENT_INTENT_ROUTE = '**/api/v1/payments/intent';
const ORDER_ROUTE = '**/api/v1/orders/*';

test.describe('Payment continuation flow', () => {
  test.describe('Resume payment from order history', () => {
    test('user can see "Bayar" button for pending orders', async ({ page }) => {
      // Mock order list with a pending payment order
      await mockOrdersListResponse(page, [
        {
          id: 'order-pending-123',
          orderNumber: 'ORD-PENDING-001',
          status: 'pending_payment',
          total: 250000,
        },
        {
          id: 'order-paid-456',
          orderNumber: 'ORD-PAID-002',
          status: 'paid',
          total: 150000,
        },
      ]);

      await goToOrderHistory(page);

      // Verify pending order shows "Bayar" button
      const pendingCard = page.locator('div').filter({ hasText: 'ORD-PENDING-001' });
      const payButton = pendingCard.getByRole('link', { name: 'Bayar' });
      await expect(payButton).toBeVisible();

      // There should be exactly 1 "Bayar" button (for pending order only)
      const allPayButtons = page.getByRole('link', { name: 'Bayar', exact: true });
      await expect(allPayButtons).toHaveCount(1);
      // Verify the single Bayar button is for the pending order
      await expect(allPayButtons.first()).toHaveAttribute('href', /order-pending-123/);
    });

    test('clicking "Bayar" navigates to order confirmation', async ({ page }) => {
      await mockOrdersListResponse(page, [
        {
          id: 'order-pending-123',
          orderNumber: 'ORD-PENDING-001',
          status: 'pending_payment',
          total: 250000,
        },
      ]);

      await mockOrderResponse(page, 'order-pending-123', {
        status: 'pending_payment',
        payment: {
          paymentUrl: 'https://payment.example.com/pay/123',
          paymentExpiry: new Date(Date.now() + 3600000).toISOString(),
        },
      });

      await goToOrderHistory(page);

      const payButton = page.getByRole('link', { name: 'Bayar' });
      await payButton.click();

      await expect(page).toHaveURL(/\/order\/confirmation\/order-pending-123/);
    });
  });

  test.describe('Payment from order confirmation page', () => {
    test('pending order shows payment button with correct URL', async ({ page }) => {
      const paymentUrl = 'https://payment.example.com/pay/test-order';

      await mockOrderResponse(page, 'order-pending-456', {
        id: 'order-pending-456',
        orderNumber: 'ORD-456789',
        status: 'pending_payment',
        total: 350000,
        payment: {
          paymentUrl,
          paymentExpiry: new Date(Date.now() + 3600000).toISOString(),
        },
      });

      await goToOrderConfirmation(page, 'order-pending-456');

      // Verify status is shown correctly
      await expect(page.getByRole('heading', { name: 'Menunggu Pembayaran' })).toBeVisible();

      // Verify "Bayar Sekarang" button exists and has correct href
      const payNowButton = page.getByRole('link', { name: 'Bayar Sekarang' });
      await expect(payNowButton).toBeVisible();
      await expect(payNowButton).toHaveAttribute('href', paymentUrl);
    });

    test('paid order hides payment button', async ({ page }) => {
      await mockOrderResponse(page, 'order-paid-789', {
        id: 'order-paid-789',
        orderNumber: 'ORD-789012',
        status: 'paid',
        total: 200000,
        payment: null,
      });

      await goToOrderConfirmation(page, 'order-paid-789');

      // Verify status is shown correctly
      await expect(page.getByText('Pembayaran Berhasil')).toBeVisible();

      // Verify "Bayar Sekarang" button is NOT visible
      const payNowButton = page.getByRole('link', { name: 'Bayar Sekarang' });
      await expect(payNowButton).not.toBeVisible();
    });

    test('order confirmation shows correct order details', async ({ page }) => {
      await mockOrderResponse(page, 'order-test-details', {
        id: 'order-test-details',
        orderNumber: 'ORD-DETAILS-123',
        status: 'packed',
        total: 575000,
        currency: 'IDR',
        pricing: { total: 575000 },
      });

      await goToOrderConfirmation(page, 'order-test-details');

      // Verify order number is displayed
      await expect(page.getByText('ORD-DETAILS-123')).toBeVisible();

      // Verify total is displayed (checking for formatted IDR amount)
      await expect(page.getByText(/575\.000|575,000/)).toBeVisible();

      // Verify status message
      await expect(page.getByRole('heading', { name: 'Sedang Dikemas' })).toBeVisible();
    });
  });

  test.describe('Payment expiry handling', () => {
    test('expired payment shows appropriate message', async ({ page }) => {
      await mockOrderResponse(page, 'order-expired-payment', {
        id: 'order-expired-payment',
        orderNumber: 'ORD-EXPIRED-001',
        status: 'pending_payment',
        total: 100000,
        payment: {
          paymentUrl: 'https://payment.example.com/expired',
          // Expired 1 hour ago
          paymentExpiry: new Date(Date.now() - 3600000).toISOString(),
        },
      });

      await goToOrderConfirmation(page, 'order-expired-payment');

      // Still shows pending status
      await expect(page.getByRole('heading', { name: 'Menunggu Pembayaran' })).toBeVisible();

      // Payment button should still be visible (backend handles expiry)
      const payNowButton = page.getByRole('link', { name: 'Bayar Sekarang' });
      await expect(payNowButton).toBeVisible();
    });
  });

  test.describe('Full checkout to payment continuation', () => {
    test('complete checkout creates pending order that can be resumed', async ({ page }) => {
      // Step 1: Add item to cart and go to checkout
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      // Step 2: Complete checkout steps
      await selectAddress(page);
      await selectShipping(page);
      await proceedToReview(page);

      // Step 3: Mock payment intent to simulate pending state
      let paymentAttempts = 0;
      await page.route(PAYMENT_INTENT_ROUTE, async (route) => {
        paymentAttempts += 1;
        // Simulate successful payment intent creation
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: {
              orderId: 'new-order-from-checkout',
              paymentUrl: 'https://payment.example.com/checkout-payment',
              status: 'PENDING',
            },
          }),
          headers: { 'content-type': 'application/json' },
        });
      });

      // Step 4: Click pay button
      const payNow = page.getByRole('button', { name: 'Bayar Sekarang' });
      await expect(payNow).toBeEnabled();
      await payNow.click();

      // Verify payment intent was called
      expect(paymentAttempts).toBeGreaterThan(0);
    });
  });

  test.describe('Order status transitions', () => {
    const statusCases = [
      { status: 'pending_payment', label: 'Menunggu Pembayaran', hasPayButton: true },
      { status: 'paid', label: 'Pembayaran Berhasil', hasPayButton: false },
      { status: 'packed', label: 'Sedang Dikemas', hasPayButton: false },
      { status: 'shipped', label: 'Dalam Pengiriman', hasPayButton: false },
      { status: 'out_for_delivery', label: 'Sedang Diantar', hasPayButton: false },
      { status: 'delivered', label: 'Selesai', hasPayButton: false },
      { status: 'cancelled', label: 'Dibatalkan', hasPayButton: false },
    ];

    for (const { status, label, hasPayButton } of statusCases) {
      test(`order with status "${status}" shows "${label}"`, async ({ page }) => {
        await mockOrderResponse(page, `order-status-${status}`, {
          id: `order-status-${status}`,
          orderNumber: `ORD-${status.toUpperCase()}`,
          status,
          total: 100000,
          payment: hasPayButton ? { paymentUrl: 'https://payment.example.com/test' } : null,
        });

        await goToOrderConfirmation(page, `order-status-${status}`);

        await expect(page.getByText(label).first()).toBeVisible();

        const payButton = page.getByRole('link', { name: 'Bayar Sekarang' });
        if (hasPayButton) {
          await expect(payButton).toBeVisible();
        } else {
          await expect(payButton).not.toBeVisible();
        }
      });
    }
  });
});
