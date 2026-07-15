import { expect, test } from '@playwright/test';

import {
  goToOrderConfirmation,
  goToOrderHistory,
  mockOrderResponse,
  mockOrdersListResponse,
} from './fixtures';

test.describe('Order history page', () => {
  test.describe('Order list display', () => {
    test('displays orders with correct status labels', async ({ page }) => {
      await mockOrdersListResponse(page, [
        { id: 'order-1', orderNumber: 'ORD-001', status: 'pending_payment', total: 100000 },
        { id: 'order-2', orderNumber: 'ORD-002', status: 'paid', total: 200000 },
        { id: 'order-3', orderNumber: 'ORD-003', status: 'processing', total: 300000 },
        { id: 'order-4', orderNumber: 'ORD-004', status: 'shipped', total: 400000 },
        { id: 'order-5', orderNumber: 'ORD-005', status: 'completed', total: 500000 },
        { id: 'order-6', orderNumber: 'ORD-006', status: 'cancelled', total: 150000 },
      ]);

      await goToOrderHistory(page);

      // Verify all orders are displayed
      await expect(page.getByText('ORD-001')).toBeVisible();
      await expect(page.getByText('ORD-002')).toBeVisible();
      await expect(page.getByText('ORD-003')).toBeVisible();
      await expect(page.getByText('ORD-004')).toBeVisible();
      await expect(page.getByText('ORD-005')).toBeVisible();
      await expect(page.getByText('ORD-006')).toBeVisible();

      // Verify status labels
      await expect(page.getByText('Menunggu Pembayaran')).toBeVisible();
      await expect(page.getByText('Dibayar')).toBeVisible();
      await expect(page.getByText('Diproses')).toBeVisible();
      await expect(page.getByText('Dikirim')).toBeVisible();
      await expect(page.getByText('Selesai')).toBeVisible();
      await expect(page.getByText('Dibatalkan')).toBeVisible();
    });

    test('displays formatted order totals', async ({ page }) => {
      await mockOrdersListResponse(page, [
        { id: 'order-1', orderNumber: 'ORD-001', status: 'paid', total: 1250000, currency: 'IDR' },
      ]);

      await goToOrderHistory(page);

      // Verify formatted currency (Indonesian format)
      await expect(page.getByText(/1\.250\.000|1,250,000/)).toBeVisible();
    });

    test('displays order item count', async ({ page }) => {
      await mockOrdersListResponse(page, [
        { id: 'order-1', orderNumber: 'ORD-001', status: 'paid', total: 100000, itemCount: 5 },
      ]);

      await goToOrderHistory(page);

      await expect(page.getByText('5 Barang')).toBeVisible();
    });

    test('displays formatted order date', async ({ page }) => {
      const orderDate = new Date('2025-12-25T14:30:00Z');

      await mockOrdersListResponse(page, [
        {
          id: 'order-1',
          orderNumber: 'ORD-001',
          status: 'paid',
          total: 100000,
          createdAt: orderDate.toISOString(),
        },
      ]);

      await goToOrderHistory(page);

      // Verify date is displayed (checking for Indonesian format)
      await expect(page.getByText(/25 Desember 2025/i)).toBeVisible();
    });
  });

  test.describe('Order actions', () => {
    test('pending orders show "Bayar" button', async ({ page }) => {
      await mockOrdersListResponse(page, [
        {
          id: 'order-pending',
          orderNumber: 'ORD-PENDING',
          status: 'pending_payment',
          total: 100000,
        },
      ]);

      await goToOrderHistory(page);

      const payButton = page.getByRole('link', { name: 'Bayar' });
      await expect(payButton).toBeVisible();
      await expect(payButton).toHaveAttribute('href', /\/order\/confirmation\/order-pending/);
    });

    test('all orders show "Detail" button', async ({ page }) => {
      await mockOrdersListResponse(page, [
        { id: 'order-1', orderNumber: 'ORD-001', status: 'paid', total: 100000 },
        { id: 'order-2', orderNumber: 'ORD-002', status: 'pending_payment', total: 200000 },
      ]);

      await goToOrderHistory(page);

      const detailButtons = page.getByRole('link', { name: 'Detail' });
      await expect(detailButtons).toHaveCount(2);
    });

    test('clicking "Detail" navigates to order confirmation', async ({ page }) => {
      await mockOrdersListResponse(page, [
        { id: 'order-detail-test', orderNumber: 'ORD-DETAIL', status: 'paid', total: 100000 },
      ]);

      await mockOrderResponse(page, 'order-detail-test', {
        id: 'order-detail-test',
        orderNumber: 'ORD-DETAIL',
        status: 'paid',
        total: 100000,
      });

      await goToOrderHistory(page);

      const detailButton = page.getByRole('link', { name: 'Detail' });
      await detailButton.click();

      await expect(page).toHaveURL(/\/account\/orders\/order-detail-test/);
    });
  });

  test.describe('Empty state', () => {
    test('shows empty state when no orders', async ({ page }) => {
      await mockOrdersListResponse(page, []);

      await goToOrderHistory(page);

      await expect(page.getByText('Belum ada pesanan')).toBeVisible();
      await expect(page.getByText(/Riwayat pesanan Anda akan muncul/)).toBeVisible();

      const shopButton = page.getByRole('link', { name: /Lanjutkan belanja/i });
      await expect(shopButton).toBeVisible();
    });
  });

  test.describe('Error handling', () => {
    test('shows error message when API fails', async ({ page }) => {
      await page.route('**/api/v1/orders*', async (route) => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: { message: 'Internal server error' } }),
          headers: { 'content-type': 'application/json' },
        });
      });

      await page.goto('/account/orders');

      await expect(page.getByText('Gagal memuat riwayat pesanan')).toBeVisible();
    });
  });

  test.describe('Loading state', () => {
    test('shows skeleton while loading', async ({ page }) => {
      // Add delay to API response to see loading state
      await page.route('**/api/v1/orders*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [], meta: { total: 0 } }),
          headers: { 'content-type': 'application/json' },
        });
      });

      await page.goto('/account/orders');

      // Verify skeleton is visible initially
      const skeleton = page.locator('.animate-pulse');
      await expect(skeleton.first()).toBeVisible();
    });
  });
});

test.describe('Order confirmation page', () => {
  test.describe('Status display', () => {
    const statusTestCases = [
      {
        status: 'pending_payment',
        label: 'Menunggu Pembayaran',
        message: 'Silakan selesaikan pembayaran',
        iconColor: 'text-amber-600',
      },
      {
        status: 'paid',
        label: 'Pembayaran Berhasil',
        message: 'Pembayaran Anda telah diterima',
        iconColor: 'text-green-600',
      },
      {
        status: 'processing',
        label: 'Sedang Diproses',
        message: 'Pesanan Anda sedang diproses',
        iconColor: 'text-blue-600',
      },
      {
        status: 'shipped',
        label: 'Dalam Pengiriman',
        message: 'Pesanan Anda sedang dalam perjalanan',
        iconColor: 'text-purple-600',
      },
      {
        status: 'completed',
        label: 'Selesai',
        message: 'Pesanan Anda telah selesai',
        iconColor: 'text-green-600',
      },
      {
        status: 'cancelled',
        label: 'Dibatalkan',
        message: 'Pesanan ini telah dibatalkan',
        iconColor: 'text-red-600',
      },
    ];

    for (const { status, label, message } of statusTestCases) {
      test(`shows correct UI for "${status}" status`, async ({ page }) => {
        await mockOrderResponse(page, `order-${status}`, {
          id: `order-${status}`,
          orderNumber: `ORD-${status.toUpperCase()}`,
          status,
          total: 100000,
        });

        await goToOrderConfirmation(page, `order-${status}`);

        await expect(page.getByText(label).first()).toBeVisible();
        await expect(page.getByText(new RegExp(message, 'i'))).toBeVisible();
      });
    }
  });

  test.describe('Order details', () => {
    test('displays order number and total', async ({ page }) => {
      await mockOrderResponse(page, 'order-details', {
        id: 'order-details',
        orderNumber: 'ORD-ABCD-1234',
        status: 'paid',
        total: 875000,
        currency: 'IDR',
        pricing: { total: 875000 },
      });

      await goToOrderConfirmation(page, 'order-details');

      await expect(page.getByText('ORD-ABCD-1234')).toBeVisible();
      await expect(page.getByText(/875\.000|875,000/)).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('has link to order history', async ({ page }) => {
      await mockOrderResponse(page, 'order-nav-test', {
        id: 'order-nav-test',
        orderNumber: 'ORD-NAV',
        status: 'paid',
        total: 100000,
      });

      await goToOrderConfirmation(page, 'order-nav-test');

      const ordersLink = page.getByRole('link', { name: 'Lihat Pesanan Saya' });
      await expect(ordersLink).toBeVisible();
      await expect(ordersLink).toHaveAttribute('href', '/account/orders');
    });

    test('has link to continue shopping', async ({ page }) => {
      await mockOrderResponse(page, 'order-shop-test', {
        id: 'order-shop-test',
        orderNumber: 'ORD-SHOP',
        status: 'paid',
        total: 100000,
      });

      await goToOrderConfirmation(page, 'order-shop-test');

      const shopLink = page.getByRole('link', { name: 'Lanjut Belanja' });
      await expect(shopLink).toBeVisible();
      await expect(shopLink).toHaveAttribute('href', '/');
    });
  });

  test.describe('Error handling', () => {
    test('shows fallback UI when order not found', async ({ page }) => {
      await page.route('**/api/v1/orders/*', async (route) => {
        await route.fulfill({
          status: 404,
          body: JSON.stringify({ error: { message: 'Order not found' } }),
          headers: { 'content-type': 'application/json' },
        });
      });

      await goToOrderConfirmation(page, 'non-existent-order');

      // Should show fallback UI with order ID
      await expect(page.getByText('non-existent-order')).toBeVisible();
      await expect(page.getByText('Detail pesanan sedang diproses')).toBeVisible();
    });
  });
});
