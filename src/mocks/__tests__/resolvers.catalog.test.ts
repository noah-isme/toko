import { describe, expect, it } from 'vitest';

import { products } from '../fixtures';
import { getProduct, getRelated, listProducts } from '../resolvers/catalog';
import { handleMockRequest } from '../route';

function list(query: Record<string, string> = {}) {
  return listProducts(new URLSearchParams(query));
}

describe('catalog resolver', () => {
  it('returns the whole catalog on one default page', () => {
    const page = list();
    expect(page.data.map((p) => p.id)).toEqual(products.map((p) => p.id));
    expect(page.pagination).toEqual({ page: 1, perPage: 20, totalItems: products.length });
  });

  it('matches q against title, description, category and brand', () => {
    expect(list({ q: 'MACBOOK' }).data.map((p) => p.slug)).toEqual(['macbook-pro-14-m3']);
    const byCategoryName = list({ q: 'electronics' }).data;
    expect(byCategoryName.length).toBeGreaterThan(1);
    expect(byCategoryName.every((p) => p.categoryName === 'Electronics')).toBe(true);
    expect(list({ q: 'zzz-no-match' }).data).toEqual([]);
  });

  it('filters by category and brand id or name', () => {
    expect(list({ category: 'cat-electronics' }).data).toEqual(
      list({ category: 'electronics' }).data,
    );
    expect(list({ brand: 'brand-apple' }).data).toEqual(list({ brand: 'APPLE' }).data);
    expect(list({ brand: 'apple' }).data.every((p) => p.brandId === 'brand-apple')).toBe(true);
  });

  it('filters by price range and stock', () => {
    const ranged = list({ minPrice: '500000', maxPrice: '5000000' }).data;
    expect(ranged.length).toBeGreaterThan(0);
    expect(ranged.every((p) => p.price >= 500000 && p.price <= 5000000)).toBe(true);
    expect(list({ inStock: 'true' }).data).toHaveLength(products.length);
  });

  it('sorts by price and name and ignores unknown sorts', () => {
    const asc = list({ sort: 'price:asc' }).data.map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(list({ sort: 'price:desc' }).data.map((p) => p.price)).toEqual([...asc].reverse());
    const names = list({ sort: 'name:asc' }).data.map((p) => p.title);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(list({ sort: 'name:desc' }).data.map((p) => p.title)).toEqual([...names].reverse());
    expect(list({ sort: 'popular' }).data).toEqual(list().data);
  });

  it('paginates with page and limit', () => {
    const first = list({ page: '1', limit: '5' });
    const second = list({ page: '2', limit: '5' });
    expect(first.data).toHaveLength(5);
    expect(second.data[0]).toEqual(products[5]);
    expect(second.pagination).toEqual({ page: 2, perPage: 5, totalItems: products.length });
    expect(list({ page: '9', limit: '5' }).data).toEqual([]);
  });

  it('finds products by slug and lists related products', () => {
    expect(getProduct('macbook-pro-14-m3')?.title).toBe('MacBook Pro 14 M3');
    expect(getProduct('nope')).toBeUndefined();
    const related = getRelated('macbook-pro-14-m3');
    expect(related).toHaveLength(4);
    expect(related.some((p) => p.slug === 'macbook-pro-14-m3')).toBe(false);
  });
});

describe('MSW and route parity', () => {
  it('serve identical product ids for /products', async () => {
    const msw = await fetch('http://localhost/api/v1/products').then((res) => res.json());
    const route = handleMockRequest('products', 'GET', null, 'parity') as {
      data: Array<{ id: string }>;
    };
    expect(msw.data.map((p: { id: string }) => p.id)).toEqual(route.data.map((p) => p.id));
  });

  it('serve the same product detail', async () => {
    const msw = await fetch('http://localhost/api/v1/products/iphone-15-pro').then((res) =>
      res.json(),
    );
    expect(msw).toEqual(handleMockRequest('products/iphone-15-pro', 'GET', null, 'parity'));
  });

  // Regression: the route (used without MSW, e.g. build:mock + start:mock and
  // Playwright) had no taxonomy endpoints, so the /products filter sidebar
  // showed "Filter kategori dan merek belum tersedia".
  it.each(['categories', 'brands'])('serve the same /%s taxonomy', async (path) => {
    const msw = await fetch(`http://localhost/api/v1/${path}`).then((res) => res.json());
    const route = handleMockRequest(path, 'GET', null, 'parity') as { data: unknown[] };
    expect(route.data.length).toBeGreaterThan(0);
    expect(msw).toEqual(route);
  });
});
