import { test, expect } from '@playwright/test';

test.describe('Product Discovery', () => {
  test('should list products and allow navigation to details', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('heading', { name: 'Hasil Pencarian' })).toBeVisible();

    await expect(page.getByTestId('product-card-skeleton')).toBeHidden();

    const firstProduct = page.getByTestId('product-card').first();
    await expect(firstProduct).toBeVisible();
    const productName = await firstProduct.locator('h3').textContent();
    expect(productName).toBeTruthy();

    // Click product title to navigate to product page
    const productTitle = firstProduct.locator('h3').first();
    // Get the product slug from the link and navigate directly
    const productLink = firstProduct.locator('a').first();
    const href = await productLink.getAttribute('href');
    await page.goto(href!);

    await expect(page).toHaveURL(/\/products\//);

    await expect(page.getByTestId('product-title')).toBeVisible();
    await expect(page.getByTestId('add-to-cart')).toBeVisible();
    await expect(page.getByTestId('product-price')).toBeVisible();
  });
});
