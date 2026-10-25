/**
 * The alerts and invoice endpoints are served by both mock layers from shared
 * resolvers; these checks keep the MSW handlers and the `/api/v1` route mock
 * answering identically, including the binary invoice response.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { products } from '../fixtures';
import { resetMockAlerts } from '../handlers.alerts';
import { isMockBinary } from '../resolvers/binary';
import { resetMockState } from '../resolvers/session';
import { handleMockRequest } from '../route';

type Step = { method: string; path: string; body?: unknown };

const SESSION = 'alerts-parity-session';

/** A freshly created alert is stamped "now" (with milliseconds) on each side; seeds are not. */
function normalise(body: unknown): unknown {
  return JSON.parse(
    JSON.stringify(body ?? null).replace(/"createdAt":"[^"]+\.\d{3}Z"/g, '"createdAt":"<now>"'),
  );
}

async function viaMsw({ method, path, body }: Step) {
  const res = await fetch(`http://localhost/api/v1/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: normalise(text ? JSON.parse(text) : null) };
}

function viaRoute({ method, path, body }: Step) {
  const [pathname, query = ''] = path.split('?');
  const result = handleMockRequest(
    pathname,
    method,
    body ?? null,
    SESSION,
    new URLSearchParams(query),
  );
  if (!result) return { status: 404, body: null };
  if (!Array.isArray(result) && typeof result.status === 'number') {
    const { status, ...rest } = result;
    return { status, body: status === 204 ? null : normalise(rest) };
  }
  return { status: 200, body: normalise(result) };
}

async function expectSameSequence(steps: Step[]) {
  for (const step of steps) {
    const [msw, route] = [await viaMsw(step), viaRoute(step)];
    expect(route, `${step.method} ${step.path}`).toEqual(msw);
  }
}

beforeEach(() => {
  resetMockAlerts();
  resetMockState();
});

afterEach(() => {
  resetMockAlerts();
  resetMockState();
});

describe('alerts mocks', () => {
  it('list, subscribe, re-arm, reject and delete identically', async () => {
    const [first, , third] = products;
    await expectSameSequence([
      { method: 'GET', path: 'alerts' },
      { method: 'GET', path: `alerts?productId=${first.id}` },
      { method: 'GET', path: 'alerts?productId=not-a-uuid' },
      { method: 'GET', path: 'alerts?page=99999999&limit=500' },
      { method: 'POST', path: 'alerts', body: { productId: third.id, type: 'PRICE_DROP' } },
      { method: 'POST', path: 'alerts', body: { productId: third.id, type: 'price_drop' } },
      { method: 'POST', path: 'alerts', body: { productId: third.id, type: 'BACK_IN_STOCK' } },
      { method: 'POST', path: 'alerts', body: { productId: third.id, type: 'NOPE' } },
      { method: 'POST', path: 'alerts', body: { productId: 'x', type: 'PRICE_DROP' } },
      {
        method: 'POST',
        path: 'alerts',
        body: { productId: '00000000-0000-4000-8000-000000000000', type: 'PRICE_DROP' },
      },
      { method: 'POST', path: 'alerts', body: [] },
      { method: 'GET', path: 'alerts' },
      { method: 'DELETE', path: 'alerts/a1e70000-0000-4000-8000-000000000002' },
      { method: 'DELETE', path: 'alerts/a1e70000-0000-4000-8000-000000000002' },
      { method: 'DELETE', path: 'alerts/bad-id' },
      { method: 'GET', path: 'alerts' },
    ]);
  });

  it('answers the documented statuses', () => {
    const [first, , third] = products;
    const post = (body: unknown) => viaRoute({ method: 'POST', path: 'alerts', body });
    expect(post({ productId: third.id, type: 'PRICE_DROP' }).status).toBe(201);
    expect(post({ productId: third.id, type: 'PRICE_DROP' }).status).toBe(200);
    expect(post({ productId: first.id, type: 'BACK_IN_STOCK' })).toMatchObject({
      status: 409,
      body: { error: { code: 'ALREADY_IN_STOCK' } },
    });
    expect(viaRoute({ method: 'GET', path: 'alerts?page=99999999' }).body).toMatchObject({
      data: [],
    });
  });
});

describe('invoice mocks', () => {
  async function mswInvoice(orderId: string) {
    const res = await fetch(`http://localhost/api/v1/orders/${orderId}/invoice`);
    return res;
  }

  it('serves the same PDF attachment from both layers', async () => {
    const route = handleMockRequest('orders/order-1001/invoice', 'GET', null, SESSION);
    expect(isMockBinary(route)).toBe(true);
    if (!isMockBinary(route)) return;

    const res = await mswInvoice('order-1001');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const disposition = res.headers.get('content-disposition');
    expect(disposition).toMatch(/^attachment; filename="INV-\d{4}-\d{6}\.pdf"$/);
    expect(route.__binary.headers['Content-Disposition']).toBe(disposition);

    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes)).toEqual(Array.from(route.__binary.body));
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it.each([
    ['order-pending-1', 409, 'INVOICE_NOT_AVAILABLE'],
    ['order-status-cancelled', 409, 'INVOICE_NOT_AVAILABLE'],
    ['non-existent-order', 404, 'NOT_FOUND'],
  ])('answers %s with %i %s on both layers', async (orderId, status, code) => {
    const res = await mswInvoice(orderId);
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ error: { code } });
    expect(viaRoute({ method: 'GET', path: `orders/${orderId}/invoice` })).toMatchObject({
      status,
      body: { error: { code } },
    });
  });
});
