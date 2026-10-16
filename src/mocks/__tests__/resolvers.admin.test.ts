// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

import { MOCK_ADMIN_TOKEN, adminOrders, products } from '../fixtures';
import { resetMockState } from '../resolvers/session';
import { handleMockRequest } from '../route';

const ADMIN = { headers: new Headers({ authorization: `Bearer ${MOCK_ADMIN_TOKEN}` }) };

type Json = any;

function admin(
  method: string,
  path: string,
  body: unknown = null,
  query = '',
  session = 's1',
): Json {
  return handleMockRequest(path, method, body, session, new URLSearchParams(query), ADMIN);
}

afterEach(() => resetMockState());

describe('admin resolver', () => {
  it('rejects admin paths without the admin token', () => {
    for (const headers of [new Headers(), new Headers({ authorization: 'Bearer mock-token' })]) {
      expect(
        handleMockRequest('admin/products', 'GET', null, 's1', undefined, { headers }),
      ).toEqual({
        status: 403,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
    }
  });

  it('returns 404 for admin endpoints the mock does not implement', () => {
    expect(admin('GET', 'admin/vouchers').status).toBe(404);
    expect(admin('GET', 'admin/products/does-not-exist').status).toBe(404);
  });

  it('gives the admin token the admin role on auth/me and auth/session', () => {
    expect(admin('GET', 'auth/me').data.roles).toEqual(['admin']);
    expect(admin('GET', 'auth/session').data.user.roles).toEqual(['admin']);
  });

  it('lists seeded products with pagination and search', () => {
    const page = admin('GET', 'admin/products', null, 'limit=5&page=2');
    expect(page.data).toHaveLength(5);
    expect(page.data[0].id).toBe(products[5].id);
    expect(page.data[0]).not.toHaveProperty('variants');
    expect(page.pagination).toEqual({ page: 2, perPage: 5, totalItems: products.length });
    expect(
      admin('GET', 'admin/products', null, 'search=macbook').data.map((p: Json) => p.slug),
    ).toEqual(['macbook-pro-14-m3']);
    expect(admin('GET', 'admin/products', null, 'q=macbook').pagination.totalItems).toBe(1);
    const apple = admin('GET', 'admin/products', null, 'brand=apple').data;
    expect(apple.length).toBeGreaterThan(0);
    expect(apple.every((p: Json) => p.brandId === 'brand-apple')).toBe(true);
  });

  it('round-trips product create, read, update, stock and delete', () => {
    const created = admin('POST', 'admin/products', {
      title: 'Kopi Gayo 250g',
      price: 85000,
      categoryId: 'cat-health',
      variants: [{ sku: 'KOPI-250', stock: 12 }],
    });
    expect(created.status).toBe(201);
    expect(created.data.slug).toBe('kopi-gayo-250g');
    const { id } = created.data;

    const detail = admin('GET', `admin/products/${id}`).data;
    expect(detail).toMatchObject({
      title: 'Kopi Gayo 250g',
      price: 85000,
      stock: 12,
      sku: 'KOPI-250',
    });
    expect(detail.categoryName).toBe('Health');
    expect(admin('GET', 'admin/products/kopi-gayo-250g').data.id).toBe(id);
    expect(admin('GET', 'admin/products').pagination.totalItems).toBe(products.length + 1);

    admin('PATCH', `admin/products/${id}`, {
      title: 'Kopi Gayo 500g',
      images: ['https://cdn.example/k.jpg'],
    });
    const updated = admin('GET', `admin/products/${id}`).data;
    expect(updated.title).toBe('Kopi Gayo 500g');
    expect(updated.images).toEqual([
      { id: `${id}-image-1`, url: 'https://cdn.example/k.jpg', sortOrder: 0 },
    ]);

    expect(admin('PATCH', `admin/products/${id}/stock`, { stock: 0 }).data).toEqual({
      id,
      inStock: false,
      stock: 0,
    });

    expect(admin('DELETE', `admin/products/${id}`).data).toEqual({ id });
    expect(admin('GET', `admin/products/${id}`).status).toBe(404);
  });

  it('validates product creation input', () => {
    expect(admin('POST', 'admin/products', { price: 1 }).status).toBe(400);
  });

  it('keeps admin edits per session and leaves the fixtures untouched', () => {
    const target = products[0].id;
    admin('PATCH', `admin/products/${target}`, { title: 'Changed' });
    expect(admin('GET', `admin/products/${target}`).data.title).toBe('Changed');
    expect(admin('GET', `admin/products/${target}`, null, '', 'other').data.title).toBe(
      products[0].title,
    );
    expect(products[0].title).not.toBe('Changed');
  });

  it('lists orders, filters by status and updates status', () => {
    const all = admin('GET', 'admin/orders');
    expect(all.pagination.totalItems).toBe(adminOrders.length);
    expect(all.data[0]).not.toHaveProperty('items');

    const paid = admin('GET', 'admin/orders', null, 'status=PAID').data;
    expect(paid.length).toBeGreaterThan(0);
    expect(paid.every((o: Json) => o.status === 'PAID')).toBe(true);

    const order = adminOrders[0];
    expect(admin('GET', `admin/orders/${order.id}`).data.items.length).toBeGreaterThan(0);
    expect(admin('PATCH', `admin/orders/${order.id}/status`, { status: 'NOPE' }).status).toBe(400);
    expect(
      admin('PATCH', `admin/orders/${order.id}/status`, { status: 'SHIPPED' }).data.status,
    ).toBe('SHIPPED');
    expect(admin('GET', `admin/orders/${order.id}`).data.status).toBe('SHIPPED');
  });

  it('computes order stats, analytics and taxonomy counts from the store', () => {
    const stats = admin('GET', 'admin/orders/stats').data;
    expect(stats.totalOrders).toBe(adminOrders.length);
    expect(stats.cancelledOrders).toBe(adminOrders.filter((o) => o.status === 'CANCELLED').length);

    const overview = admin('GET', 'admin/analytics/overview', null, 'range=7d').data;
    expect(overview).toMatchObject({ range: '7d', totalProducts: products.length });
    expect(overview.totalRevenue).toBe(stats.totalRevenue);
    expect(overview.topProducts.length).toBeGreaterThan(0);

    const categories = admin('GET', 'admin/categories').data;
    const electronics = categories.find((c: Json) => c.slug === 'electronics');
    expect(electronics.productCount).toBe(
      products.filter((p) => p.categoryId === 'cat-electronics').length,
    );
    expect(
      admin('GET', 'admin/brands').data.find((b: Json) => b.slug === 'apple').productCount,
    ).toBeGreaterThan(0);
  });

  it('accepts PUT for product updates', () => {
    const target = products[1].id;
    admin('PUT', `admin/products/${target}`, { price: 1 });
    expect(admin('GET', `admin/products/${target}`).data.price).toBe(1);
  });
});
