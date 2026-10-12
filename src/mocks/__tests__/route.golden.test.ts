// @vitest-environment node
/**
 * Golden snapshots for the in-process mock API (`src/app/api/v1/[[...path]]/route.ts`).
 *
 * Recorded against the original single-file route before it was split into
 * `src/mocks/route.ts` + resolvers; the port must reproduce every response
 * byte for byte. The only intended difference is the `roles` field on
 * `auth/me` and `auth/session`, which was added as a separate snapshot update.
 */
import { faker } from '@faker-js/faker';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, PATCH, POST } from '@/app/api/v1/[[...path]]/route';

const FROZEN_NOW = new Date('2026-03-15T09:30:00.000Z');
const SESSION_COOKIE = 'mockSessionId=golden-session; X-CSRF-Token=golden-csrf';
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type CallOptions = {
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  cookie?: string | null;
};

const handlers = { GET, POST, PATCH, DELETE } as const;

async function call(method: Method, path: string, options: CallOptions = {}) {
  const url = new URL(`http://localhost:3000/api/v1/${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value);
  }
  const headers = new Headers(options.headers);
  const cookie = options.cookie === undefined ? SESSION_COOKIE : options.cookie;
  if (cookie) headers.set('cookie', cookie);
  if (options.body !== undefined) headers.set('content-type', 'application/json');

  const req = new NextRequest(url, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const params = Promise.resolve({ path: path ? path.split('/') : undefined });
  const res = await handlers[method](req, { params });

  const text = await res.text();
  return {
    status: res.status,
    cacheControl: res.headers.get('cache-control'),
    // Fresh sessions and the double-submit CSRF cookie use crypto.randomUUID().
    setCookie: res.headers.getSetCookie().map((c) => c.replace(UUID_RE, '<uuid>')),
    body: text ? JSON.parse(text) : null,
  };
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FROZEN_NOW);
  faker.seed(20260101);
  faker.setDefaultRefDate('2026-01-01T00:00:00Z');
});

afterAll(() => {
  vi.useRealTimers();
});

describe('mock API route golden responses', () => {
  describe('catalog', () => {
    const productQueries: Array<[string, Record<string, string>]> = [
      ['default', {}],
      ['q title', { q: 'macbook' }],
      ['q category name', { q: 'fashion' }],
      ['q no match', { q: 'zzz-no-match' }],
      ['category by id', { category: 'cat-electronics' }],
      ['category by name', { category: 'Fashion' }],
      ['brand by id', { brand: 'brand-apple' }],
      ['brand by name', { brand: 'nike' }],
      ['minPrice', { minPrice: '5000000' }],
      ['maxPrice', { maxPrice: '1000000' }],
      ['price range', { minPrice: '500000', maxPrice: '5000000' }],
      ['inStock', { inStock: 'true' }],
      ['sort price:asc', { sort: 'price:asc' }],
      ['sort price:desc', { sort: 'price:desc' }],
      ['sort name:asc', { sort: 'name:asc' }],
      ['sort name:desc', { sort: 'name:desc' }],
      ['sort unknown', { sort: 'popular' }],
      ['page 1 limit 5', { page: '1', limit: '5' }],
      ['page 2 limit 5', { page: '2', limit: '5' }],
      ['page beyond range', { page: '9', limit: '5' }],
      ['combined', { q: 'pro', category: 'cat-electronics', sort: 'price:desc', limit: '3' }],
    ];

    it.each(productQueries)('GET products (%s)', async (_label, query) => {
      expect(await call('GET', 'products', { query })).toMatchSnapshot();
    });

    it('GET products/:slug found and 404', async () => {
      expect(await call('GET', 'products/macbook-pro-14-m3')).toMatchSnapshot();
      expect(await call('GET', 'products/does-not-exist')).toMatchSnapshot();
    });

    it('GET products/:slug/related', async () => {
      expect(await call('GET', 'products/macbook-pro-14-m3/related')).toMatchSnapshot();
    });

    it('GET products/:slug reviews and stats', async () => {
      expect(await call('GET', 'products/macbook-pro-14-m3/reviews')).toMatchSnapshot();
      expect(await call('GET', 'products/macbook-pro-14-m3/reviews/stats')).toMatchSnapshot();
    });

    it('product Q&A endpoints', async () => {
      expect(await call('GET', 'products/prod-1/questions')).toMatchSnapshot();
      expect(
        await call('GET', 'products/prod-1/questions', { query: { page: '2', limit: '2' } }),
      ).toMatchSnapshot();
      expect(
        await call('POST', 'products/prod-1/questions', { body: { question: 'Garansi?' } }),
      ).toMatchSnapshot();
      expect(await call('GET', 'questions/question-1')).toMatchSnapshot();
      expect(
        await call('POST', 'questions/question-1/answer', { body: { answer: 'Ya, 1 tahun' } }),
      ).toMatchSnapshot();
      expect(
        await call('POST', 'questions/question-1/vote', { body: { dir: 'up' } }),
      ).toMatchSnapshot();
      expect(
        await call('POST', 'questions/question-1/vote', { body: { dir: 'down' } }),
      ).toMatchSnapshot();
    });
  });

  describe('cart', () => {
    it('GET cart variants', async () => {
      expect(await call('GET', 'carts')).toMatchSnapshot();
      expect(await call('GET', 'cart')).toMatchSnapshot();
      expect(await call('GET', 'carts/cart-123')).toMatchSnapshot();
      expect(await call('GET', 'carts/empty')).toMatchSnapshot();
      expect(await call('GET', 'carts/cart-123', { query: { empty: 'true' } })).toMatchSnapshot();
      expect(
        await call('GET', 'carts/cart-123', { headers: { authorization: 'Bearer empty' } }),
      ).toMatchSnapshot();
    });

    it('cart add, update and remove', async () => {
      expect(await call('POST', 'carts')).toMatchSnapshot();
      expect(
        await call('POST', 'carts/cart-123/items', { body: { productId: 'x', qty: 2 } }),
      ).toMatchSnapshot();
      expect(
        await call('PATCH', 'carts/cart-123/items/cart-item-1', { body: { qty: 3 } }),
      ).toMatchSnapshot();
      expect(
        await call('PATCH', 'carts/cart-123/items/cart-item-2', { body: { quantity: 4 } }),
      ).toMatchSnapshot();
      expect(
        await call('PATCH', 'carts/cart-123/items/cart-item-1', { body: {} }),
      ).toMatchSnapshot();
      expect(await call('DELETE', 'carts/cart-123/items/cart-item-1')).toMatchSnapshot();
    });

    it('apply and remove voucher', async () => {
      for (const code of ['save10', ' SHIPFREE ', 'NOPE']) {
        expect(
          await call('POST', 'carts/cart-123/apply-voucher', { body: { code } }),
        ).toMatchSnapshot();
      }
      expect(await call('DELETE', 'carts/cart-123/voucher')).toMatchSnapshot();
    });

    it('voucher validate and apply', async () => {
      for (const path of ['vouchers/validate', 'vouchers/apply']) {
        for (const code of ['SAVE10', 'shipfree', 'BAD']) {
          expect(await call('POST', path, { body: { code } })).toMatchSnapshot();
        }
      }
    });
  });

  describe('checkout and payments', () => {
    it('shipping quote', async () => {
      expect(
        await call('POST', 'quote/shipping', { body: { postalCode: '10110' } }),
      ).toMatchSnapshot();
      expect(await call('POST', 'carts/cart-123/quote/shipping', { body: {} })).toMatchSnapshot();
    });

    it('checkout, draft, payment intent and status sequence', async () => {
      const cookie = 'mockSessionId=golden-payments; X-CSRF-Token=golden-csrf';
      expect(
        await call('POST', 'checkout', { body: { paymentMethod: 'ewallet' }, cookie }),
      ).toMatchSnapshot();
      expect(await call('POST', 'checkout/draft', { body: {}, cookie })).toMatchSnapshot();
      expect(await call('GET', 'payments/order-success-id/status', { cookie })).toMatchSnapshot();
      expect(
        await call('POST', 'payments/intent', { body: { orderId: 'order-success-id' }, cookie }),
      ).toMatchSnapshot();
      expect(await call('GET', 'payments/order-success-id/status', { cookie })).toMatchSnapshot();
      // A different session is isolated from the payment above.
      expect(await call('GET', 'payments/order-success-id/status')).toMatchSnapshot();
      // A fresh checkout resets the order to unpaid.
      expect(await call('POST', 'checkout', { body: {}, cookie })).toMatchSnapshot();
      expect(await call('GET', 'payments/order-success-id/status', { cookie })).toMatchSnapshot();
      expect(
        await call('POST', 'payments/intent', { body: { provider: 'xendit' }, cookie }),
      ).toMatchSnapshot();
    });
  });

  describe('orders', () => {
    const orderQueries: Array<[string, Record<string, string>]> = [
      ['default', {}],
      ['status paid', { status: 'paid' }],
      ['status all', { status: 'all' }],
      ['status empty', { status: 'empty' }],
      ['empty flag', { empty: 'true' }],
      ['error 500', { error: '500' }],
      ['paged', { page: '2', limit: '2' }],
    ];

    it.each(orderQueries)('GET orders (%s)', async (_label, query) => {
      expect(await call('GET', 'orders', { query })).toMatchSnapshot();
    });

    it.each([
      'non-existent-order',
      'order-status-shipped',
      'order-expired-payment',
      'order-shop-test',
      'order-detail-test',
      'order-pending-123',
      'order-1',
    ])('GET orders/%s', async (orderId) => {
      expect(await call('GET', `orders/${orderId}`)).toMatchSnapshot();
    });
  });

  describe('addresses', () => {
    it('address CRUD', async () => {
      expect(await call('GET', 'addresses')).toMatchSnapshot();
      expect(await call('GET', 'users/me/addresses')).toMatchSnapshot();
      expect(await call('POST', 'users/me/addresses', { body: {} })).toMatchSnapshot();
      expect(
        await call('POST', 'users/me/addresses', {
          body: {
            receiverName: 'Rina',
            phone: '0811111111',
            addressLine1: 'Jl. Merdeka 1',
            city: 'Surabaya',
            province: 'Jawa Timur',
            postalCode: '60111',
            isDefault: true,
          },
        }),
      ).toMatchSnapshot();
      expect(
        await call('PATCH', 'users/me/addresses/address-2', { body: { city: 'Bogor' } }),
      ).toMatchSnapshot();
      // The resolver returns `{ status: 204 }`; the route answers with an empty 204.
      expect(await call('DELETE', 'users/me/addresses/address-2')).toMatchSnapshot();
    });
  });

  describe('auth', () => {
    it('auth routes', async () => {
      expect(
        await call('POST', 'auth/register', { body: { name: 'Rina', email: 'rina@example.com' } }),
      ).toMatchSnapshot();
      expect(await call('POST', 'auth/register', { body: {} })).toMatchSnapshot();
      expect(
        await call('POST', 'auth/login', { body: { email: 'budi@example.com', password: 'x' } }),
      ).toMatchSnapshot();
      expect(
        await call('POST', 'auth/login', { body: { email: 'wrong@example.com', password: 'x' } }),
      ).toMatchSnapshot();
      expect(
        await call('POST', 'auth/login', { body: { email: 'a@b.c', password: 'wrongpassword' } }),
      ).toMatchSnapshot();
      expect(await call('POST', 'auth/logout')).toMatchSnapshot();
      expect(await call('GET', 'auth/me')).toMatchSnapshot();
      expect(
        await call('GET', 'auth/me', { headers: { authorization: 'Bearer mock-token' } }),
      ).toMatchSnapshot();
      expect(
        await call('PATCH', 'users/me', { body: { name: 'Johnny', phone: '0812' } }),
      ).toMatchSnapshot();
      expect(await call('POST', 'auth/password/forgot', { body: {} })).toMatchSnapshot();
      expect(await call('POST', 'auth/password/reset', { body: {} })).toMatchSnapshot();
      expect(await call('POST', 'auth/email/verify', { body: {} })).toMatchSnapshot();
      expect(await call('POST', 'auth/email/resend', { body: {} })).toMatchSnapshot();
      expect(await call('GET', 'auth/sessions')).toMatchSnapshot();
      expect(await call('POST', 'auth/logout/all')).toMatchSnapshot();
      expect(await call('POST', 'auth/refresh')).toMatchSnapshot();
      expect(await call('GET', 'auth/session')).toMatchSnapshot();
    });
  });

  describe('payment instructions, notifications and push', () => {
    it('GET payments/:orderId/instructions', async () => {
      expect(await call('GET', 'payments/order-success-id/instructions')).toMatchSnapshot();
    });

    it('notifications list, unread count and mark read', async () => {
      const cookie = 'mockSessionId=golden-notifications; X-CSRF-Token=golden-csrf';
      expect(await call('GET', 'notifications', { cookie })).toMatchSnapshot();
      expect(
        await call('GET', 'notifications', { query: { page: '2', limit: '2' }, cookie }),
      ).toMatchSnapshot();
      expect(await call('GET', 'notifications/unread-count', { cookie })).toMatchSnapshot();
      expect(
        await call('POST', 'notifications/11111111-1111-1111-1111-111111111111/read', { cookie }),
      ).toMatchSnapshot();
      expect(await call('POST', 'notifications/unknown-id/read', { cookie })).toMatchSnapshot();
      expect(await call('GET', 'notifications/unread-count', { cookie })).toMatchSnapshot();
      expect(await call('POST', 'notifications/read-all', { cookie })).toMatchSnapshot();
      expect(await call('GET', 'notifications/unread-count', { cookie })).toMatchSnapshot();
      // Another session still sees its own unread seed.
      expect(await call('GET', 'notifications/unread-count')).toMatchSnapshot();
    });

    it('push vapid key, preferences and subscription', async () => {
      const cookie = 'mockSessionId=golden-push; X-CSRF-Token=golden-csrf';
      expect(await call('GET', 'push/vapid-key', { cookie })).toMatchSnapshot();
      expect(await call('GET', 'push/preferences', { cookie })).toMatchSnapshot();
      expect(
        await call('PATCH', 'push/preferences', {
          body: { types: { promo_updates: true, unknown_type: true } },
          cookie,
        }),
      ).toMatchSnapshot();
      expect(await call('POST', 'push/send-test', { cookie })).toMatchSnapshot();
      expect(await call('POST', 'push/subscription', { body: {}, cookie })).toMatchSnapshot();
      expect(
        await call('POST', 'push/subscription', {
          body: {
            subscription: {
              endpoint: 'https://push.example.com/sub-1',
              keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
            },
          },
          cookie,
        }),
      ).toMatchSnapshot();
      expect(await call('GET', 'push/preferences', { cookie })).toMatchSnapshot();
      expect(await call('POST', 'push/send-test', { cookie })).toMatchSnapshot();
      expect(
        await call('DELETE', 'push/subscription', {
          query: { endpoint: 'https://push.example.com/sub-1' },
          cookie,
        }),
      ).toMatchSnapshot();
      expect(await call('GET', 'push/preferences', { cookie })).toMatchSnapshot();
    });
  });

  describe('cart voucher persistence', () => {
    it('keeps an applied voucher on the cart until removed or a new cart is created', async () => {
      const cookie = 'mockSessionId=golden-voucher; X-CSRF-Token=golden-csrf';
      const getCart = () => call('GET', 'carts/cart-123', { cookie });
      const apply = (code: string) =>
        call('POST', 'carts/cart-123/apply-voucher', { body: { code }, cookie });
      await apply('save10');
      expect(await getCart()).toMatchSnapshot();
      // An unknown code leaves the applied voucher in place.
      await apply('NOPE');
      expect(await getCart()).toMatchSnapshot();
      await apply('SHIPFREE');
      expect(
        await call('PATCH', 'carts/cart-123/items/cart-item-1', { body: { qty: 2 }, cookie }),
      ).toMatchSnapshot();
      await call('DELETE', 'carts/cart-123/voucher', { cookie });
      expect(await getCart()).toMatchSnapshot();
      await apply('SAVE10');
      await call('POST', 'carts', { cookie });
      expect(await getCart()).toMatchSnapshot();
      // Other sessions never see this session's voucher.
      expect(await call('GET', 'carts/cart-123')).toMatchSnapshot();
    });
  });

  describe('newsletter', () => {
    it('subscribe, duplicate and validation errors', async () => {
      const cookie = 'mockSessionId=golden-newsletter; X-CSRF-Token=golden-csrf';
      const subscribe = (body: unknown) => call('POST', 'newsletter/subscribe', { body, cookie });
      expect(await subscribe({ email: ' Rina@Example.com ' })).toMatchSnapshot();
      expect(await subscribe({ email: 'rina@example.com' })).toMatchSnapshot();
      expect(await subscribe({ email: 'rina@@example.com' })).toMatchSnapshot();
      expect(await subscribe({ email: '   ' })).toMatchSnapshot();
      expect(await subscribe({})).toMatchSnapshot();
      expect(await call('POST', 'newsletter/subscribe', { cookie })).toMatchSnapshot();
    });
  });

  describe('session and fallbacks', () => {
    it('sets session and CSRF cookies for a new visitor', async () => {
      expect(await call('GET', 'products/macbook-pro-14-m3', { cookie: null })).toMatchSnapshot();
    });

    it('returns 404 for unknown routes and methods', async () => {
      expect(await call('GET', 'does/not/exist')).toMatchSnapshot();
      expect(await call('GET', '')).toMatchSnapshot();
      expect(await call('DELETE', 'products')).toMatchSnapshot();
      expect(await call('PATCH', 'orders/order-1')).toMatchSnapshot();
    });
  });
});
