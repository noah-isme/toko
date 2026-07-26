import type { Page } from '@playwright/test';

import { test, expect } from './fixtures/real-api-auth.fixture';

const SCREENSHOT_DIR = 'test-results/screenshots/real-api';

test.describe.configure({ retries: 0 });

test.describe('Visual E2E Tests with Real Toko API', () => {
  // Helper to take screenshot with consistent naming
  async function takeScreenshot(page: Page, name: string) {
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/${name}.png`,
      fullPage: true,
    });
  }

  // Helper to wait for page to be fully loaded
  async function waitForPageLoad(page: Page) {
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
  }

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await waitForPageLoad(page);
  });

  test.describe('Homepage & Product Discovery', () => {
    test('should display homepage with products @visual', async ({ page }) => {
      await page.goto('/');
      await waitForPageLoad(page);
      await takeScreenshot(page, '01-homepage');

      // Verify key elements are visible
      await expect(page.getByRole('heading', { name: /produk|products/i })).toBeVisible();
    });

    test('should display product listing page @visual', async ({ page }) => {
      await page.goto('/products');
      await waitForPageLoad(page);
      await takeScreenshot(page, '02-products-listing');

      // Verify products are loaded
      await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
        timeout: 15000,
      });
    });

    test('should display product detail page @visual', async ({ page }) => {
      // Navigate to products first to get a product
      await page.goto('/products');
      await waitForPageLoad(page);

      // Click on first product
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();
      await waitForPageLoad(page);
      await takeScreenshot(page, '03-product-detail');

      // Verify product details are visible
      await expect(page.locator('[data-testid="product-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-to-cart"]')).toBeVisible();
    });
  });

  test.describe('Authentication Flow', () => {
    test('should display login page @visual', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);
      await takeScreenshot(page, '04-login-page');

      await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();
    });

    test('should display register page @visual', async ({ page }) => {
      await page.goto('/register');
      await waitForPageLoad(page);
      await takeScreenshot(page, '05-register-page');

      await expect(page.getByRole('heading', { name: /register|daftar/i })).toBeVisible();
    });

    test('should handle login with invalid credentials @visual', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Wait for error message
      await page.waitForSelector('[role="alert"], .error-message', { timeout: 10000 });
      await takeScreenshot(page, '06-login-error');
    });
  });

  test.describe('Cart Flow', () => {
    test('should display empty cart @visual', async ({ page }) => {
      await page.goto('/cart');
      await waitForPageLoad(page);
      await takeScreenshot(page, '07-empty-cart');

      await expect(page.getByRole('heading', { name: /shopping cart|keranjang/i })).toBeVisible();
    });

    test('should add product to cart and display cart @visual', async ({ page }) => {
      // Go to products
      await page.goto('/products');
      await waitForPageLoad(page);

      // Click first product
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();
      await waitForPageLoad(page);

      // Add to cart
      await page.locator('[data-testid="add-to-cart"]').click();

      // Wait for toast/notification
      await page.waitForSelector('[role="status"], .toast', { timeout: 10000 });

      // Go to cart
      await page.goto('/cart');
      await waitForPageLoad(page);
      await takeScreenshot(page, '08-cart-with-item');

      // Verify item is in cart
      await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible();
    });
  });

  test.describe('Checkout Flow', () => {
    test('should display checkout address step @visual', async ({ page }) => {
      // Setup: Add item to cart first
      await page.goto('/products');
      await waitForPageLoad(page);

      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();
      await waitForPageLoad(page);
      await page.locator('[data-testid="add-to-cart"]').click();
      await page.waitForSelector('[role="status"], .toast', { timeout: 10000 });

      // Go to checkout
      await page.goto('/checkout');
      await waitForPageLoad(page);
      await takeScreenshot(page, '09-checkout-address');

      await expect(page.getByRole('heading', { name: /checkout|alamat/i })).toBeVisible();
    });

    test('should display checkout shipping step @visual', async ({ page }) => {
      // Setup: Add item to cart and go to checkout
      await page.goto('/products');
      await waitForPageLoad(page);

      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();
      await waitForPageLoad(page);
      await page.locator('[data-testid="add-to-cart"]').click();
      await page.waitForSelector('[role="status"], .toast', { timeout: 10000 });

      // Go to checkout
      await page.goto('/checkout');
      await waitForPageLoad(page);

      // Select address
      const addressRadio = page.getByRole('radio').first();
      await addressRadio.click();

      // Click continue
      await page.getByRole('button', { name: /lanjutkan|continue/i }).click();
      await waitForPageLoad(page);
      await takeScreenshot(page, '10-checkout-shipping');

      await expect(page.getByRole('heading', { name: /shipping|pengiriman/i })).toBeVisible();
    });

    test('should display checkout payment step @visual', async ({ page }) => {
      // Setup: Add item to cart and go through checkout steps
      await page.goto('/products');
      await waitForPageLoad(page);

      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();
      await waitForPageLoad(page);
      await page.locator('[data-testid="add-to-cart"]').click();
      await page.waitForSelector('[role="status"], .toast', { timeout: 10000 });

      await page.goto('/checkout');
      await waitForPageLoad(page);

      // Select address
      await page.getByRole('radio').first().click();
      await page.getByRole('button', { name: /lanjutkan|continue/i }).click();
      await waitForPageLoad(page);

      // Select shipping
      await page.locator('input[name="shipping-option"]').first().check({ force: true });
      await page.getByRole('button', { name: /lanjutkan|continue/i }).click();
      await waitForPageLoad(page);
      await takeScreenshot(page, '11-checkout-payment');

      await expect(page.getByRole('heading', { name: /payment|pembayaran/i })).toBeVisible();
    });

    test('should display checkout review step @visual', async ({ page }) => {
      // Setup: Add item to cart and go through all checkout steps
      await page.goto('/products');
      await waitForPageLoad(page);

      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();
      await waitForPageLoad(page);
      await page.locator('[data-testid="add-to-cart"]').click();
      await page.waitForSelector('[role="status"], .toast', { timeout: 10000 });

      await page.goto('/checkout');
      await waitForPageLoad(page);

      // Address
      await page.getByRole('radio').first().click();
      await page.getByRole('button', { name: /lanjutkan|continue/i }).click();
      await waitForPageLoad(page);

      // Shipping
      await page.locator('input[name="shipping-option"]').first().check({ force: true });
      await page.getByRole('button', { name: /lanjutkan|continue/i }).click();
      await waitForPageLoad(page);

      // Payment - select payment method
      await page.locator('input[name="payment-method"]').first().check({ force: true });
      await page.getByRole('button', { name: /lanjutkan|continue/i }).click();
      await waitForPageLoad(page);
      await takeScreenshot(page, '12-checkout-review');

      await expect(
        page.getByRole('heading', { name: /review|review order|konfirmasi/i }),
      ).toBeVisible();
    });
  });

  test.describe('Account & Orders', () => {
    test('should display order history page @visual', async ({ page }) => {
      await page.goto('/account/orders');
      await waitForPageLoad(page);
      await takeScreenshot(page, '13-order-history');

      // Should redirect to login or show orders
      await expect(page.getByRole('heading', { name: /pesanan|orders/i })).toBeVisible({
        timeout: 15000,
      });
    });

    test('should display account profile page @visual', async ({ page }) => {
      await page.goto('/account/profile');
      await waitForPageLoad(page);
      await takeScreenshot(page, '14-account-profile');

      await expect(page.getByRole('heading', { name: /profile|profil/i })).toBeVisible({
        timeout: 15000,
      });
    });

    test('should display address management page @visual', async ({ page }) => {
      await page.goto('/account/addresses');
      await waitForPageLoad(page);
      await takeScreenshot(page, '15-address-management');

      await expect(page.getByRole('heading', { name: /address|alamat/i })).toBeVisible({
        timeout: 15000,
      });
    });
  });

  test.describe('Search & Filter', () => {
    test('should display search results @visual', async ({ page }) => {
      await page.goto('/search?q=headphone');
      await waitForPageLoad(page);
      await takeScreenshot(page, '16-search-results');

      await expect(page.getByRole('heading', { name: /search|hasil/i })).toBeVisible();
    });

    test('should display category page @visual', async ({ page }) => {
      await page.goto('/category/audio');
      await waitForPageLoad(page);
      await takeScreenshot(page, '17-category-page');

      await expect(page.getByRole('heading', { name: /audio|category/i })).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display mobile homepage @visual', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await waitForPageLoad(page);
      await takeScreenshot(page, '18-mobile-homepage');
    });

    test('should display mobile product detail @visual', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/products');
      await waitForPageLoad(page);

      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();
      await waitForPageLoad(page);
      await takeScreenshot(page, '19-mobile-product-detail');
    });

    test('should display mobile cart @visual', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/cart');
      await waitForPageLoad(page);
      await takeScreenshot(page, '20-mobile-cart');
    });

    test('should display tablet homepage @visual', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await waitForPageLoad(page);
      await takeScreenshot(page, '21-tablet-homepage');
    });

    test('should display desktop homepage @visual', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await waitForPageLoad(page);
      await takeScreenshot(page, '22-desktop-homepage');
    });
  });

  test.describe('Error States', () => {
    test('should display 404 page @visual', async ({ page }) => {
      await page.goto('/non-existent-page');
      await waitForPageLoad(page);
      await takeScreenshot(page, '23-404-page');

      await expect(
        page.getByRole('heading', { name: /404|not found|tidak ditemukan/i }),
      ).toBeVisible();
    });

    test('should display empty state for empty category @visual', async ({ page }) => {
      await page.goto('/category/non-existent-category');
      await waitForPageLoad(page);
      await takeScreenshot(page, '24-empty-category');
    });
  });
});
