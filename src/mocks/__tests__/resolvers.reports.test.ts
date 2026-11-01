// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

import { MOCK_ADMIN_TOKEN, adminOrders } from '../fixtures';
import { csvText } from '../resolvers/reports';
import { adminStore, resetMockState } from '../resolvers/session';
import { handleMockRequest } from '../route';

const ADMIN = { headers: new Headers({ authorization: `Bearer ${MOCK_ADMIN_TOKEN}` }) };
/** Covers every fixture order (they are dated in December 2025). */
const RANGE = 'from=2025-11-01&to=2026-01-15';
const REVENUE = new Set(['PAID', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']);

type Json = any;

function report(name: string, query = RANGE, session = 's1'): Json {
  return handleMockRequest(
    `admin/reports/${name}`,
    'GET',
    null,
    session,
    new URLSearchParams(query),
    ADMIN,
  );
}

const revenueOrders = adminOrders.filter((o) => REVENUE.has(o.status));
const itemRevenue = revenueOrders.flatMap((o) => o.items).reduce((s, i) => s + i.subtotal, 0);
const itemUnits = revenueOrders.flatMap((o) => o.items).reduce((s, i) => s + i.qty, 0);

afterEach(() => resetMockState());

describe('admin reports resolver', () => {
  it('requires the admin token', () => {
    expect(
      handleMockRequest('admin/reports/conversion', 'GET', null, 's1', undefined, {
        headers: new Headers(),
      }),
    ).toMatchObject({ status: 403 });
  });

  it.each([
    ['from=2026-02-01&to=2026-01-01', 'from must be before to'],
    ['from=2025-01-01&to=2026-01-03', 'range must not exceed 366 days'],
    ['from=yesterday', 'invalid from: use RFC3339 or YYYY-MM-DD'],
    ['from=2026-02-31', 'invalid from: use RFC3339 or YYYY-MM-DD'],
    [`${RANGE}&format=xlsx`, 'format must be json or csv'],
  ])('rejects %s with 400 BAD_REQUEST', (query, message) => {
    expect(report('customers', query)).toEqual({
      status: 400,
      error: { code: 'BAD_REQUEST', message },
    });
  });

  it('echoes the resolved range in the tenant timezone', () => {
    const { data } = report('conversion', 'from=2025-12-01&to=2025-12-08');
    expect(data).toMatchObject({
      from: '2025-12-01T00:00:00+07:00',
      to: '2025-12-08T00:00:00+07:00',
      timezone: 'Asia/Jakarta',
    });
    // RFC3339 bounds are used as-is.
    expect(
      report('conversion', 'from=2025-12-01T00:00:00Z&to=2025-12-02T00:00:00Z').data.from,
    ).toBe('2025-12-01T07:00:00+07:00');
  });

  it('defaults to the 30 local days ending at the next tenant midnight', () => {
    const { data } = report('conversion', '');
    const span = Date.parse(data.to) - Date.parse(data.from);
    expect(span).toBe(30 * 86_400_000);
    expect(data.to.endsWith('T00:00:00+07:00')).toBe(true);
  });

  it('returns zeros and empty rows for an empty range', () => {
    const query = 'from=2024-01-01&to=2024-01-31';
    expect(report('sales-by-category', query).data).toMatchObject({
      totalRevenue: 0,
      totalUnits: 0,
      rows: [],
    });
    expect(report('sales-by-product', query)).toMatchObject({
      data: [],
      pagination: { page: 1, perPage: 20, totalItems: 0 },
    });
    expect(report('conversion', query).data).toMatchObject({
      cartsCreated: 0,
      checkoutRate: 0,
      paymentRate: 0,
      conversionRate: 0,
    });
    expect(report('customers', query).data).toMatchObject({ totalCustomers: 0, daily: [] });
  });

  it('sums gross item revenue of revenue-rule orders by category', () => {
    const { data } = report('sales-by-category');
    expect(data.totalRevenue).toBe(itemRevenue);
    expect(data.totalUnits).toBe(itemUnits);
    expect(data.rows.reduce((s: number, r: Json) => s + r.revenue, 0)).toBe(itemRevenue);
    const revenues = data.rows.map((r: Json) => r.revenue);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
    for (const row of data.rows) {
      expect(row.share).toBe(Math.round((row.revenue / itemRevenue) * 10_000) / 10_000);
    }
  });

  it('paginates products and filters them by category', () => {
    const all = report('sales-by-product', `${RANGE}&limit=100`);
    expect(all.range.timezone).toBe('Asia/Jakarta');
    expect(all.data.reduce((s: number, r: Json) => s + r.revenue, 0)).toBe(itemRevenue);

    const page2 = report('sales-by-product', `${RANGE}&limit=2&page=2`);
    expect(page2.pagination).toEqual({ page: 2, perPage: 2, totalItems: all.data.length });
    expect(page2.data).toEqual(all.data.slice(2, 4));

    const categoryId = report('sales-by-category').data.rows[0].categoryId;
    const filtered = report('sales-by-product', `${RANGE}&limit=100&categoryId=${categoryId}`);
    expect(filtered.data.length).toBeGreaterThan(0);
    expect(filtered.data.every((r: Json) => r.categoryId === categoryId)).toBe(true);

    expect(report('sales-by-product', `${RANGE}&categoryId=not a uuid`).status).toBe(400);
  });

  it('builds the conversion funnel from orders in range', () => {
    const { data } = report('conversion');
    expect(data.checkoutsStarted).toBe(adminOrders.length);
    expect(data.paidOrders).toBe(revenueOrders.length);
    expect(data.paidOrders + data.pendingOrders + data.cancelledOrders + data.refundedOrders).toBe(
      data.checkoutsStarted,
    );
    expect(data.paidRevenue).toBe(revenueOrders.reduce((s, o) => s + o.total, 0));
    expect(data.paymentRate).toBe(
      Math.round((data.paidOrders / data.checkoutsStarted) * 10_000) / 10_000,
    );
  });

  it('splits customers into new and returning and keeps revenue whole', () => {
    const { data } = report('customers');
    expect(data.totalCustomers).toBe(data.newCustomers + data.returningCustomers);
    expect(data.revenueFromNew + data.revenueFromReturning + data.guestRevenue).toBe(
      revenueOrders.reduce((s, o) => s + o.total, 0),
    );
    expect(data.daily.map((d: Json) => d.day)).toEqual(
      [...data.daily.map((d: Json) => d.day)].sort(),
    );
  });

  it('counts a user whose first revenue order precedes `from` as returning', () => {
    // A PAID order well before the range (in tenant time, not just UTC).
    const paid = adminOrders.find((o) => o.status === 'PAID' && o.createdAt < '2025-12-20')!;
    report('customers'); // seeds the session store
    const store = adminStore('s1', () => ({ products: [], orders: [] }));
    store.orders.push({
      ...structuredClone(paid),
      id: 'repeat-order',
      createdAt: '2026-01-05T03:00:00Z',
    });
    store.orders.push({
      ...structuredClone(paid),
      id: 'guest-order',
      userId: undefined,
      createdAt: '2026-01-06T03:00:00Z',
    });

    // Starts on Jan 2: a fixture order at 2025-12-31T17:48Z is already Jan 1 in Asia/Jakarta.
    const { data } = report('customers', 'from=2026-01-02&to=2026-01-15');
    expect(data).toMatchObject({
      newCustomers: 0,
      returningCustomers: 1,
      totalCustomers: 1,
      repeatRate: 1,
      ordersFromReturning: 1,
      revenueFromReturning: paid.total,
      guestOrders: 1,
      guestRevenue: paid.total,
    });
    // Guests are left out of the daily series.
    expect(data.daily).toEqual([
      { day: '2026-01-05', newCustomers: 0, returningCustomers: 1, orders: 1, revenue: paid.total },
    ]);
  });

  it('returns CSV attachments with the backend columns and filename', () => {
    const csv = report('sales-by-category', `${RANGE}&format=csv`);
    expect(csv.file.contentType).toBe('text/csv; charset=utf-8');
    expect(csv.file.filename).toBe('sales-by-category_2025-11-01_2026-01-15.csv');
    expect(csv.file.body.startsWith('﻿category_id,category,category_slug,units_sold')).toBe(true);

    const products = report('sales-by-product', `${RANGE}&format=csv&page=2&limit=1`);
    const lines = products.file.body.trim().split('\n');
    // page/limit are ignored: every product row is exported.
    expect(lines).toHaveLength(report('sales-by-product', `${RANGE}&limit=100`).data.length + 1);

    const conversion = report('conversion', `${RANGE}&format=csv`).file.body.trim().split('\n');
    expect(conversion).toHaveLength(2);
    expect(conversion[1].startsWith('2025-11-01T00:00:00+07:00,2026-01-15T00:00:00+07:00')).toBe(
      true,
    );

    expect(report('customers', `${RANGE}&format=csv`).file.body).toMatch(
      /^﻿day,new_customers,returning_customers,orders,revenue\n/,
    );
  });

  it('neutralises formula-like text cells', () => {
    expect(csvText('=HYPERLINK("http://x","y")')).toBe('\'=HYPERLINK("http://x","y")');
    expect(csvText('+1')).toBe("'+1");
    expect(csvText('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvText('-5')).toBe("'-5");
    expect(csvText('Kemeja Batik Ñ')).toBe('Kemeja Batik Ñ');
    expect(csvText(null)).toBe('');
  });

  it('applies the revenue rule to order stats and the analytics overview', () => {
    const stats = handleMockRequest(
      'admin/orders/stats',
      'GET',
      null,
      's1',
      undefined,
      ADMIN,
    ) as Json;
    expect(stats.data.revenueOrders).toBe(revenueOrders.length);
    expect(stats.data.totalRevenue).toBe(revenueOrders.reduce((s, o) => s + o.total, 0));
    expect(stats.data.averageOrderValue).toBe(
      Math.round(stats.data.totalRevenue / stats.data.revenueOrders),
    );
    const overview = handleMockRequest(
      'admin/analytics/overview',
      'GET',
      null,
      's1',
      undefined,
      ADMIN,
    ) as Json;
    expect(overview.data.revenueOrders).toBe(revenueOrders.length);
  });
});
