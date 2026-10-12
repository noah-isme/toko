import { expect, test, type Page, type Request } from '@playwright/test';

// A seeded product (src/mocks/data.ts SEED_PRODUCTS); stable across mock runs.
const SEED_SLUG = 'macbook-pro-14-m3';
const SEED_TITLE = 'MacBook Pro 14 M3';

/** Client-side product *list* requests (`/api/v1/products` or `/api/v1/products?...`). */
function isProductListRequest(request: Request): boolean {
  return new URL(request.url()).pathname.replace(/\/$/, '') === '/api/v1/products';
}

/** Collects React hydration-mismatch errors (server HTML differs from the client render). */
function collectHydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  const record = (text: string) => {
    if (/hydrat/i.test(text)) errors.push(text.split('\n')[0]);
  };
  page.on('console', (message) => {
    if (message.type() === 'error') record(message.text());
  });
  page.on('pageerror', (error) => record(error.message));
  return errors;
}

test.describe('server-rendered catalog', () => {
  test('product detail HTML contains the product title', async ({ page }) => {
    const response = await page.request.get(`/products/${SEED_SLUG}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('data-testid="product-title"');
    expect(html).toContain(SEED_TITLE);
  });

  test('products listing HTML contains product cards', async ({ page }) => {
    const response = await page.request.get('/products');
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html.match(/data-testid="product-card"/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  test('first paint of /products makes no client product list request', async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);
    const productListRequests: string[] = [];
    page.on('request', (request) => {
      if (isProductListRequest(request)) productListRequests.push(request.url());
    });

    // The filter sidebar fetches /categories on mount, in the same commit in
    // which useProducts would fetch, so its response proves the island has
    // hydrated. (`networkidle` never settles under `pnpm dev`: HMR socket.)
    const hydrated = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/v1/categories',
    );
    await page.goto('/products');
    await expect(page.getByTestId('product-card').first()).toBeVisible();
    await hydrated;
    // Allow any trailing mount-time effects to fire a refetch.
    await page.waitForTimeout(1_000);

    expect(productListRequests).toEqual([]);
    expect(hydrationErrors).toEqual([]);
  });

  test('product detail hydrates without mismatches', async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);
    await page.goto(`/products/${SEED_SLUG}`);
    await expect(page.getByTestId('product-title')).toHaveText(SEED_TITLE);
    await expect(page.getByTestId('qa-section')).toBeVisible();
    await page.waitForTimeout(1_000);
    expect(hydrationErrors).toEqual([]);
  });
});
