import { describe, expect, it } from 'vitest';

import { findAlert, isTargetSellable } from '@/entities/alerts/sellable';
import type { AlertSubscription } from '@/entities/alerts/types';
import { notificationHref } from '@/entities/notifications/href';
import type { Notification } from '@/lib/api/types';
import { safeRedirectPath } from '@/shared/lib/safe-redirect';

describe('isTargetSellable (cart rule)', () => {
  it('uses variant stock and ignores product.inStock for variants', () => {
    expect(isTargetSellable({ inStock: false }, { stock: 3 })).toBe(true);
    expect(isTargetSellable({ inStock: true }, { stock: 0 })).toBe(false);
  });

  it('uses inStock for a product-level target', () => {
    expect(isTargetSellable({ inStock: true })).toBe(true);
    expect(isTargetSellable({ inStock: false }, null)).toBe(false);
  });
});

describe('findAlert', () => {
  const base = {
    productId: 'p1',
    priceAtSubscribe: null,
    status: 'active',
    notifiedAt: null,
    createdAt: '2026-10-01T00:00:00Z',
    product: { title: 'Oak', slug: 'oak', thumbnail: null, price: 1, inStock: false },
  } as const;
  const alerts: AlertSubscription[] = [
    { ...base, id: 'a1', variantId: null, type: 'BACK_IN_STOCK' },
    { ...base, id: 'a2', variantId: 'v2', type: 'BACK_IN_STOCK' },
    { ...base, id: 'a3', variantId: null, type: 'PRICE_DROP', priceAtSubscribe: 10 },
  ];

  it('matches type and exact variant target', () => {
    expect(findAlert(alerts, 'BACK_IN_STOCK')?.id).toBe('a1');
    expect(findAlert(alerts, 'BACK_IN_STOCK', 'v2')?.id).toBe('a2');
    expect(findAlert(alerts, 'BACK_IN_STOCK', 'v9')).toBeUndefined();
    expect(findAlert(alerts, 'PRICE_DROP')?.id).toBe('a3');
    expect(findAlert(undefined, 'PRICE_DROP')).toBeUndefined();
  });
});

describe('safeRedirectPath', () => {
  it.each([
    ['/products/oak-chair', '/products/oak-chair'],
    ['/products/oak-chair?variant=v2#reviews', '/products/oak-chair?variant=v2#reviews'],
    ['/account/orders', '/account/orders'],
  ])('keeps same-origin path %s', (raw, expected) => {
    expect(safeRedirectPath(raw)).toBe(expected);
  });

  it.each([
    null,
    '',
    'https://evil.example',
    '//evil.example/x',
    '/\\evil.example',
    'javascript:alert(1)',
    'products/oak',
    '/products/\u0000oak',
    '/login',
    '/login?redirect=/x',
    '/register',
  ])('falls back for %j', (raw) => {
    expect(safeRedirectPath(raw)).toBe('/');
    expect(safeRedirectPath(raw, '/account')).toBe('/account');
  });
});

describe('notificationHref', () => {
  const make = (type: string, data: Notification['data']): Notification => ({
    id: 'n1',
    type,
    title: 't',
    body: 'b',
    data,
    read: false,
    readAt: null,
    createdAt: '2026-10-01T00:00:00Z',
  });

  it('links order notifications to the order', () => {
    expect(notificationHref(make('order_paid', { orderId: 'o-1' }))).toBe('/account/orders/o-1');
  });

  it.each(['back_in_stock', 'price_drop'])('links %s alerts to the product', (type) => {
    expect(notificationHref(make(type, { slug: 'oak chair', productId: 'p1' }))).toBe(
      '/products/oak%20chair',
    );
  });

  it('falls back to the notification list', () => {
    expect(notificationHref(make('back_in_stock', {}))).toBe('/account/notifications');
    expect(notificationHref(make('promo', { slug: 'x' }))).toBe('/account/notifications');
  });
});
