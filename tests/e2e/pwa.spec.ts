import { request as httpRequest, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Production-only: runs from playwright.prod.config.ts (`pnpm e2e:prod`) against
// `pnpm build:mock && pnpm start:mock`. See ADR-009.
//
// Covers the former manual Chrome checks (README "PWA"): single registration,
// offline -> /offline fallback, and push -> notification.

/** Resolves once the registered worker is active and controls this page. */
async function waitForControlledPage(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    // clientsClaim: true makes the new worker take control right after activation.
    await new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }),
    );
  });
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null))
    .toMatch(/\/serwist\/sw\.js$/);
}

/** Forwards every request to `target` until closed; closing refuses new connections. */
async function startProxy(target: URL) {
  const server = createServer((req, res) => {
    const upstream = httpRequest(
      {
        host: target.hostname,
        port: target.port,
        method: req.method,
        path: req.url,
        headers: { ...req.headers, host: target.host },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      },
    );
    upstream.on('error', () => {
      res.writeHead(502).end();
    });
    req.pipe(upstream);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  // `localhost` keeps the page a secure context, which service workers need.
  const origin = `http://localhost:${port}`;
  let closed = false;
  return {
    origin,
    close: async () => {
      if (closed) return;
      closed = true;
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

// The default chromium-headless-shell build has no notification backend:
// Notification.permission stays "denied" and showNotification() rejects even
// after a grant, which the push test needs. `channel: 'chromium'` selects new
// headless Chromium (installed by `playwright install chromium`, as in CI).
test.use({ channel: 'chromium' });

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
    await waitForControlledPage(page);

    const registrations = await page.evaluate(async () => {
      const all = await navigator.serviceWorker.getRegistrations();
      return all.map((registration) => ({
        scope: registration.scope,
        scriptURL: (registration.active ?? registration.waiting ?? registration.installing)
          ?.scriptURL,
        hasWaiting: registration.waiting !== null,
        hasInstalling: registration.installing !== null,
      }));
    });

    expect(registrations).toHaveLength(1);
    const [registration] = registrations;
    expect(registration.scope).toBe(new URL('/', baseURL).toString());
    expect(registration.scriptURL).toMatch(/\/serwist\/sw\.js$/);
    expect(registration.scriptURL).toBe(new URL('/serwist/sw.js', baseURL).toString());
    expect(registration.hasWaiting).toBe(false);
    expect(registration.hasInstalling).toBe(false);
  });

  test('falls back to the precached /offline page when a navigation fails offline', async ({
    page,
    baseURL,
  }) => {
    // `context.setOffline(true)` does not reach the worker's own network
    // requests (nor navigation preload) in this Chromium build: fetch() from the
    // worker still returned 200 offline. So the app is loaded through a
    // throwaway proxy, and closing it is a genuine network failure for every
    // request the worker makes. See ADR-009.
    const proxy = await startProxy(new URL(baseURL ?? 'http://localhost:3000'));
    try {
      await page.goto(`${proxy.origin}/`);
      await waitForControlledPage(page);

      // Documents are never cached (ADR-009), so /terms can only be answered by
      // the /offline fallback once the network is gone.
      await proxy.close();
      await page.goto(`${proxy.origin}/terms`, { waitUntil: 'domcontentloaded' });

      expect(new URL(page.url()).pathname).toBe('/terms');
      // Heading is "Anda sedang offline" (id) or "You're offline" (en).
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/offline/i);
    } finally {
      await proxy.close();
    }
  });

  test('shows a notification when a push message reaches the worker', async ({
    page,
    context,
    baseURL,
  }) => {
    const origin = new URL(baseURL ?? 'http://localhost:3000').origin;
    await context.grantPermissions(['notifications'], { origin });

    // Attach the CDP listener before the worker registers so the registration
    // event is not missed.
    const cdp = await context.newCDPSession(page);
    const registrationIds = new Map<string, string>();
    cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
      for (const registration of registrations) {
        registrationIds.set(registration.scopeURL, registration.registrationId);
      }
    });
    await cdp.send('ServiceWorker.enable');

    await page.goto('/');
    await waitForControlledPage(page);
    expect(await page.evaluate(() => Notification.permission)).toBe('granted');

    const scope = new URL('/', baseURL).toString();
    await expect.poll(() => registrationIds.get(scope)).toBeTruthy();
    const registrationId = registrationIds.get(scope) as string;

    // Payload shape is the PushPayload read by src/app/sw-push.ts.
    const payload = {
      title: 'Pesanan dikirim',
      body: 'Pesanan #1042 sedang dalam perjalanan.',
      tag: 'e2e-push-order-1042',
      data: { url: '/orders/1042' },
    };
    await cdp.send('ServiceWorker.deliverPushMessage', {
      origin,
      registrationId,
      data: JSON.stringify(payload),
    });

    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const registration = await navigator.serviceWorker.ready;
            const notifications = await registration.getNotifications();
            return notifications.map((n) => ({
              title: n.title,
              body: n.body,
              tag: n.tag,
              url: (n.data as { url?: string } | null)?.url,
            }));
          }),
        { timeout: 15_000 },
      )
      .toEqual([
        {
          title: payload.title,
          body: payload.body,
          tag: payload.tag,
          url: payload.data.url,
        },
      ]);

    await cdp.send('ServiceWorker.disable');
  });
});
