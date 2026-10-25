// @vitest-environment node
/**
 * MSW and the in-process `/api/v1` route share `resolveAdmin` for the catalog
 * operations; this keeps the two mock layers from drifting apart. The two
 * layers use different mock sessions so each starts from the same seed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_ADMIN_TOKEN, adminProducts } from '../fixtures';
import { resetMockState } from '../resolvers/session';
import { handleMockRequest } from '../route';

type Step = { method: string; path: string; body?: unknown; csv?: string };

const AUTH = { authorization: `Bearer ${MOCK_ADMIN_TOKEN}` };

async function viaMsw({ method, path, body, csv }: Step) {
  let init: RequestInit = { method, headers: AUTH };
  if (csv !== undefined) {
    const form = new FormData();
    form.append('file', new File([csv], 'import.csv', { type: 'text/csv' }));
    init = { method, headers: AUTH, body: form };
  } else if (body !== undefined) {
    init = {
      method,
      headers: { ...AUTH, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
  }
  const res = await fetch(`http://localhost/api/v1/${path}`, init);
  // Keep the BOM: `res.text()` would strip it, but the downloaded file keeps it.
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await res.arrayBuffer());
  if (res.headers.get('content-type')?.startsWith('text/csv')) {
    return { status: res.status, body: { csv: text } };
  }
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function viaRoute({ method, path, body, csv }: Step) {
  const [pathname, query = ''] = path.split('?');
  const payload =
    csv !== undefined
      ? {
          fields: {},
          files: {
            file: {
              name: 'import.csv',
              type: 'text/csv',
              size: new TextEncoder().encode(csv).length,
              text: csv,
            },
          },
        }
      : (body ?? null);
  const result = handleMockRequest(
    pathname,
    method,
    payload,
    'parity-route',
    new URLSearchParams(query),
    { headers: new Headers(AUTH) },
  );
  if (!result) return { status: 404, body: null };
  if (!Array.isArray(result) && typeof result.file?.body === 'string') {
    return { status: 200, body: { csv: result.file.body } };
  }
  if (!Array.isArray(result) && typeof result.status === 'number') {
    const { status, ...rest } = result;
    return { status, body: rest };
  }
  return { status: 200, body: result };
}

async function expectSameSequence(steps: Step[]) {
  for (const step of steps) {
    const [msw, route] = [await viaMsw(step), viaRoute(step)];
    expect(route, `${step.method} ${step.path}`).toEqual(msw);
    expect(route.status, `${step.method} ${step.path}`).not.toBe(404);
  }
}

// Writes stamp `updatedAt` with the clock; freeze it so both layers agree.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-25T08:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  resetMockState();
});

describe('MSW and route mocks agree on catalog operations', () => {
  const product = adminProducts[3];
  const variantId = product.variants[0].id;
  const sku = product.variants[0].sku as string;

  it('serves list filters, bulk updates, inventory, settings and overview alike', async () => {
    await expectSameSequence([
      { method: 'GET', path: 'admin/products?stockStatus=low&sort=price:desc' },
      { method: 'GET', path: 'admin/products?sort=bogus' },
      {
        method: 'POST',
        path: 'admin/products/bulk/price',
        body: { items: [{ productId: product.id, price: 1000, applyTo: 'both' }] },
      },
      {
        method: 'POST',
        path: 'admin/products/bulk/stock',
        body: { items: [{ variantId, delta: -100 }] },
      },
      {
        method: 'POST',
        path: 'admin/products/bulk/status',
        body: { items: [{ productId: product.id, status: 'draft' }] },
      },
      { method: 'PATCH', path: `admin/products/${product.id}`, body: { lowStockThreshold: 2 } },
      { method: 'GET', path: `admin/products/${product.id}` },
      { method: 'GET', path: 'admin/inventory?stockStatus=low' },
      { method: 'PATCH', path: `admin/inventory/${variantId}`, body: { stock: 1 } },
      { method: 'PATCH', path: 'admin/settings', body: { inventory: { lowStockThreshold: 8 } } },
      { method: 'GET', path: 'admin/settings' },
      { method: 'GET', path: 'admin/analytics/overview?range=7d' },
    ]);
  });

  it('serves the same CSV exports and import previews', async () => {
    await expectSameSequence([
      { method: 'GET', path: 'admin/products/export?stockStatus=low' },
      { method: 'GET', path: 'admin/orders/export?status=PAID' },
      {
        method: 'POST',
        path: 'admin/products/import?type=stock&dryRun=true',
        csv: `sku,stock\r\n${sku},9\r\nNOPE,1\r\n`,
      },
      {
        method: 'POST',
        path: 'admin/products/import?type=stock&dryRun=false',
        csv: `sku,stock\r\n${sku},9\r\n`,
      },
      { method: 'GET', path: 'admin/inventory?stockStatus=low' },
    ]);
  });
});
