import { expect, test } from '@playwright/test';

// Production-only: runs from playwright.prod.config.ts (`pnpm e2e:prod`) against
// `pnpm build:mock && pnpm start:mock`. See ADR-009.
//
// The offline -> /offline fallback and the DevTools push test stay manual
// Chrome checks (see README "PWA"): Playwright's offline emulation does not
// reliably apply to fetches made by the service worker itself.

test.describe('service worker (production)', () => {
  test('serves /serwist/sw.js as JavaScript with the precache manifest', async ({ request }) => {
    const response = await request.get('/serwist/sw.js');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/javascript/);
    expect(response.headers()['service-worker-allowed']).toBe('/');
    expect(response.headers()['cache-control']).toContain('no-store');

    const body = await response.text();
    expect(body).toContain('precache');
    expect(body).toContain('/offline');
    expect(body).not.toContain('mockServiceWorker');
  });

  test('renders the /offline page', async ({ page }) => {
    const response = await page.goto('/offline');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('registers a single worker at scope / from /serwist/sw.js', async ({ page, baseURL }) => {
    await page.goto('/');

    const registrations = await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      const all = await navigator.serviceWorker.getRegistrations();
      return all.map((registration) => ({
        scope: registration.scope,
        scriptURL: registration.active?.scriptURL ?? null,
      }));
    });

    expect(registrations).toEqual([
      {
        scope: new URL('/', baseURL).toString(),
        scriptURL: new URL('/serwist/sw.js', baseURL).toString(),
      },
    ]);
  });
});
