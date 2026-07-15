import { test, expect } from '@playwright/test';

test.describe('Product Discovery', () => {
  test('should list products and allow navigation to details', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('heading', { name: 'Featured products' })).toBeVisible();

    await expect(page.locator('main [role="list"]')).toBeVisible();
    await expect(page.getByTestId('product-card-skeleton')).toBeHidden();

    const firstProduct = page.getByRole('listitem').first();
    const productName = await firstProduct.locator('h3').textContent();
    expect(productName).toBeTruthy();

    const viewDetailsLink = page.getByRole('link', { name: 'View details' }).first();
    await viewDetailsLink.click();

    await expect(page).toHaveURL(/\/products\//);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.getByText('Add to cart').or(page.getByText('Out of stock'))).toBeVisible();
    await expect(page.locator('.text-2xl').first()).toBeVisible();
  });
});
