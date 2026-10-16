/**
 * MSW handlers and the in-process `/api/v1` route share their resolvers for
 * these endpoints; this keeps the two mock layers from drifting apart again.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetMockNewsletter } from '../handlers.newsletter';
import { resetMockNotifications } from '../handlers.notifications';
import { resetMockPushState } from '../handlers.push';
import { resetMockState } from '../resolvers/session';
import { handleMockRequest } from '../route';

type Step = { method: string; path: string; body?: unknown };

const SESSION = 'parity-session';

async function viaMsw({ method, path, body }: Step) {
  const res = await fetch(`http://localhost/api/v1/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
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
    return { status, body: status === 204 ? null : rest };
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

beforeEach(() => {
  resetMockNewsletter();
  resetMockNotifications();
  resetMockPushState();
  resetMockState();
});

afterEach(() => {
  resetMockNewsletter();
  resetMockNotifications();
  resetMockPushState();
  resetMockState();
});

describe('MSW and route mocks agree', () => {
  it('serves payment instructions for an order', async () => {
    await expectSameSequence([{ method: 'GET', path: 'payments/order-123/instructions' }]);
  });

  it('serves the same notification list, counts and read state', async () => {
    await expectSameSequence([
      { method: 'GET', path: 'notifications' },
      { method: 'GET', path: 'notifications?page=2&limit=2' },
      { method: 'GET', path: 'notifications?limit=500' },
      { method: 'GET', path: 'notifications/unread-count' },
      { method: 'POST', path: 'notifications/22222222-2222-2222-2222-222222222222/read' },
      { method: 'POST', path: 'notifications/not-a-real-id/read' },
      { method: 'GET', path: 'notifications/unread-count' },
      { method: 'POST', path: 'notifications/read-all' },
      { method: 'GET', path: 'notifications/unread-count' },
    ]);
  });

  it('serves the same push key, preferences and subscription flow', async () => {
    const subscription = {
      endpoint: 'https://push.example.com/parity',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    };
    await expectSameSequence([
      { method: 'GET', path: 'push/vapid-key' },
      { method: 'GET', path: 'push/preferences' },
      { method: 'PATCH', path: 'push/preferences', body: { types: { stock_updates: true } } },
      { method: 'POST', path: 'push/send-test' },
      { method: 'POST', path: 'push/subscription', body: { subscription: {} } },
      { method: 'POST', path: 'push/subscription', body: { subscription } },
      { method: 'GET', path: 'push/preferences' },
      { method: 'POST', path: 'push/send-test' },
      { method: 'DELETE', path: 'push/subscription' },
      { method: 'GET', path: 'push/preferences' },
    ]);
  });

  it('subscribes to the newsletter idempotently and rejects bad emails alike', async () => {
    await expectSameSequence([
      { method: 'POST', path: 'newsletter/subscribe', body: { email: 'Budi@Example.com' } },
      { method: 'POST', path: 'newsletter/subscribe', body: { email: 'budi@example.com' } },
      { method: 'POST', path: 'newsletter/subscribe', body: { email: 'budi@@example.com' } },
      { method: 'POST', path: 'newsletter/subscribe', body: { email: '' } },
      { method: 'POST', path: 'newsletter/subscribe', body: [] },
    ]);
  });

  it('answers the shapes the web-push client parses', async () => {
    const key = await viaMsw({ method: 'GET', path: 'push/vapid-key' });
    expect(key.body).toMatchObject({
      publicKey: expect.any(String),
      public_key: expect.any(String),
    });
    const update = await viaMsw({
      method: 'PATCH',
      path: 'push/preferences',
      body: { enabled: true },
    });
    expect(update.body).toMatchObject({ success: true, message: expect.any(String) });
    expect(update.body).toMatchObject({ enabled: true, types: expect.any(Object) });
  });
});
