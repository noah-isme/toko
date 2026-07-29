import { test, expect } from '@playwright/test';

test.describe('Product Discovery', () => {
  test('should list products and allow navigation to details', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('heading', { name: 'Featured products' })).toBeVisible();

    await expect(page.getByTestId('product-card-skeleton')).toBeHidden();

    const firstProduct = page.getByTestId('product-card').first();
    await expect(firstProduct).toBeVisible();
    const productName = await firstProduct.locator('h3').textContent();
    expect(productName).toBeTruthy();

    const viewDetailsLink = page.getByRole('link', { name: 'View details' }).first();
    await viewDetailsLink.click();

    await expect(page).toHaveURL(/\/products\//);

    await expect(page.getByTestId('product-title')).toBeVisible();
    await expect(page.getByTestId('add-to-cart')).toBeVisible();
    await expect(page.getByTestId('product-price')).toBeVisible();
  });
});
