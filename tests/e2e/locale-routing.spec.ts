import { expect, test, type APIResponse } from '@playwright/test';

function setCookies(response: APIResponse): string[] {
  return response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value);
}

function localeCookie(response: APIResponse): string | undefined {
  return setCookies(response).find((cookie) => cookie.startsWith('toko-locale='));
}

test.describe('locale routing proxy', () => {
  test('redirects a dropped legacy locale prefix to the unprefixed page with 308', async ({
    page,
  }) => {
    const response = await page.request.get('/ja/products?page=2', { maxRedirects: 0 });

    expect(response.status()).toBe(308);
    expect(new URL(response.headers()['location'], 'http://localhost').pathname).toBe('/products');
    expect(response.headers()['location']).toContain('page=2');
    expect(localeCookie(response)).toMatch(/^toko-locale=id;/);
  });

  test('serves /en/products via rewrite and stores the en locale cookie', async ({ page }) => {
    const response = await page.request.get('/en/products', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(localeCookie(response)).toMatch(/^toko-locale=en;/);
    expect(await response.text()).toContain('<html');
  });

  test('resets a stale unsupported locale cookie to id', async ({ page }) => {
    const response = await page.request.get('/products', {
      headers: { cookie: 'toko-locale=ko' },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(200);
    expect(localeCookie(response)).toMatch(/^toko-locale=id;/);
  });

  test('keeps a valid en cookie on unprefixed paths', async ({ page }) => {
    const response = await page.request.get('/products', {
      headers: { cookie: 'toko-locale=en' },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(200);
    expect(localeCookie(response)).toMatch(/^toko-locale=en;/);
  });

  test('visiting /en/products in the browser keeps the prefixed URL', async ({ page }) => {
    await page.goto('/en/products');

    await expect(page).toHaveURL(/\/en\/products$/);
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === 'toko-locale')?.value).toBe('en');
  });

  test('renders <html lang="en"> for /en/products on the first request (no cookie)', async ({
    page,
  }) => {
    const response = await page.request.get('/en/products', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<html lang="en"');
  });

  test('renders <html lang="id"> for unprefixed paths without a cookie', async ({ page }) => {
    const response = await page.request.get('/products', { maxRedirects: 0 });

    expect(await response.text()).toContain('<html lang="id"');
  });

  test('renders <html lang="en"> for unprefixed paths with an en cookie', async ({ page }) => {
    const response = await page.request.get('/products', {
      headers: { cookie: 'toko-locale=en' },
      maxRedirects: 0,
    });

    expect(await response.text()).toContain('<html lang="en"');
  });

  test('switching to English stores the cookie and reloads to the /en URL', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');

    await page.getByRole('button', { name: 'Pilih bahasa' }).first().click();
    await page.getByRole('menuitemradio', { name: /english/i }).click();

    await expect(page).toHaveURL(/\/en\/products$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: 'Choose language' }).first()).toBeVisible();
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === 'toko-locale')?.value).toBe('en');

    await page.getByRole('button', { name: 'Choose language' }).first().click();
    await page.getByRole('menuitemradio', { name: /bahasa indonesia/i }).click();

    await expect(page).toHaveURL(/\/products$/);
    await expect(page).not.toHaveURL(/\/en\//);
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  });
});
