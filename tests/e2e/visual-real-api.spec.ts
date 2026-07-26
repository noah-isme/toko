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

  // Helper to wait for page to be fully loaded.
  // Deliberately not 'networkidle': the app polls (notification badge, payment
  // status), so the network never truly idles and the wait resolves on timing
  // rather than readiness. Tests assert on elements instead, which auto-wait.
  async function waitForPageLoad(page: Page) {
    await page.waitForLoadState('domcontentloaded');
  }

  // Opens the first product on a listing page. The card itself is not a link —
  // navigation happens through its "View details" anchor.
  async function openFirstProduct(page: Page) {
    const firstCard = page.locator('[data-testid="product-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    await firstCard.getByRole('link').first().click();
    await waitForPageLoad(page);
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

  // Registers a shopper over the API and installs the token the app reads from
  // localStorage. Going through the API keeps checkout tests independent of the
  // registration form's markup and validation rules.
  async function signInViaApi(page: Page) {
    const email = `checkout.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = 'Password123!';

    const registerResponse = await page.request.post(`${API_URL}/auth/register`, {
      data: { name: 'Checkout Tester', email, password },
    });
    expect(registerResponse.ok()).toBeTruthy();

    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email, password },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const token = (await loginResponse.json()).data.accessToken as string;

    await page.addInitScript((value) => {
      window.localStorage.setItem('accessToken', value);
    }, token);

    return token;
  }

  // Seeds an address for the signed-in shopper. Done over the API rather than
  // the address form so the test stays focused on the checkout screen.
  async function createAddressViaApi(page: Page, token: string) {
    const response = await page.request.post(`${API_URL}/users/me/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        label: 'Rumah',
        receiver_name: 'Checkout Tester',
        phone: '08123456789',
        address_line1: 'Jl. Merdeka 1',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postal_code: '10110',
        country: 'ID',
        is_default: true,
      },
    });
    expect(response.ok()).toBeTruthy();
  }

  // Puts one product in the cart, the precondition for the checkout screens.
  async function addFirstProductToCart(page: Page) {
    await page.goto('/products');
    await waitForPageLoad(page);
    await openFirstProduct(page);
    // The guest cart is created asynchronously on first load; clicking before it
    // exists silently drops the item.
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem('cart-storage') !== null), {
        timeout: 15000,
      })
      .toBe(true);

    const addToCart = page.locator('[data-testid="add-to-cart"]');
    await expect(addToCart).toBeEnabled({ timeout: 15000 });
    await addToCart.click();

    // The page always renders a [role="status"] live region, so waiting on that
    // returns immediately and races the cart request. The navbar cart button
    // label only changes once the item is actually in the cart.
    await expect(page.getByRole('button', { name: /open cart with/i })).toBeVisible({
      timeout: 20000,
    });
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

      // Verify key elements are visible. The homepage renders more than one
      // products-related heading, so scope to the first match.
      await expect(page.getByRole('heading', { name: /produk|products/i }).first()).toBeVisible();
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
      await openFirstProduct(page);
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

      await expect(
        page.getByRole('heading', { name: /welcome back|sign in|login/i }),
      ).toBeVisible();
    });

    test('should display register page @visual', async ({ page }) => {
      await page.goto('/register');
      await waitForPageLoad(page);
      await takeScreenshot(page, '05-register-page');

      await expect(
        page.getByRole('heading', { name: /create an account|register|daftar/i }),
      ).toBeVisible();
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
      await openFirstProduct(page);
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

      await openFirstProduct(page);
      await waitForPageLoad(page);
      await page.locator('[data-testid="add-to-cart"]').click();
      await page.waitForSelector('[role="status"], .toast', { timeout: 10000 });

      // Go to checkout
      await page.goto('/checkout');
      await waitForPageLoad(page);

      await expect(page.getByRole('heading', { name: /checkout|alamat/i }).first()).toBeVisible({
        timeout: 15000,
      });
      await takeScreenshot(page, '09-checkout-address');
    });

    test('should display checkout shipping options @visual', async ({ page }) => {
      // Shipping options only render once an address is selected, which needs a
      // signed-in shopper with a saved address.
      const token = await signInViaApi(page);
      await createAddressViaApi(page, token);

      await addFirstProductToCart(page);

      await page.goto('/checkout');
      await waitForPageLoad(page);

      await page.getByRole('radio').first().check();

      // Checkout is a single page: address, shipping and payment are sections
      // on /checkout rather than separate wizard steps.
      await expect(
        page.getByRole('heading', { name: /shipping options|pengiriman/i }).first(),
      ).toBeVisible({ timeout: 30000 });
      await takeScreenshot(page, '10-checkout-shipping');
    });

    test('should display checkout payment methods @visual', async ({ page }) => {
      await addFirstProductToCart(page);

      await page.goto('/checkout');
      await waitForPageLoad(page);
      await takeScreenshot(page, '11-checkout-payment');

      await expect(
        page.getByRole('heading', { name: /payment method|pembayaran/i }).first(),
      ).toBeVisible({ timeout: 15000 });
    });

    test('should offer the review/payment action on checkout @visual', async ({ page }) => {
      await addFirstProductToCart(page);

      await page.goto('/checkout');
      await waitForPageLoad(page);
      await takeScreenshot(page, '12-checkout-pay-action');

      // /checkout/review is not directly addressable: it requires an ?orderId=
      // plus the sessionStorage draft written when an order is placed. The
      // reachable assertion here is that its entry point is present. The
      // authenticated purchase path is covered end-to-end at the API level.
      await expect(page.getByRole('button', { name: /bayar sekarang/i }).first()).toBeVisible({
        timeout: 15000,
      });
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

      // The page has several address-related headings; assert on the first.
      await expect(page.getByRole('heading', { name: /address|alamat/i }).first()).toBeVisible({
        timeout: 15000,
      });
    });
  });

  test.describe('Search & Filter', () => {
    // Search and category browsing are query params on /products; there are no
    // separate /search or /category routes.
    test('should display search results @visual', async ({ page }) => {
      await page.goto('/products?q=kaos');
      await waitForPageLoad(page);
      await takeScreenshot(page, '16-search-results');

      await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
        timeout: 15000,
      });
    });

    test('should display category page @visual', async ({ page }) => {
      await page.goto('/products?categories=Fashion');
      await waitForPageLoad(page);
      await takeScreenshot(page, '17-category-page');

      await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
        timeout: 15000,
      });
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

      await openFirstProduct(page);
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
