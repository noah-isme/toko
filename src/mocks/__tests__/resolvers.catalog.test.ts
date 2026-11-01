import { describe, expect, it } from 'vitest';

import { products } from '../fixtures';
import { getProduct, getRelated, listProducts, mockUnitsSold } from '../resolvers/catalog';
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

  it('filters category and brand by slug', () => {
    const homeLiving = list({ category: 'home-living' }).data;
    expect(homeLiving.length).toBeGreaterThan(0);
    expect(homeLiving.every((p) => p.categoryId === 'cat-home-living')).toBe(true);
    expect(list({ brand: 'apple' }).data).toEqual(list({ brand: 'brand-apple' }).data);
  });

  it('sorts by title, popularity and rating like the API', () => {
    const titles = list({ sort: 'title:asc' }).data.map((p) => p.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    expect(list({ sort: 'title:desc' }).data.map((p) => p.title)).toEqual([...titles].reverse());
    const sold = list({ sort: 'popularity:desc' }).data.map(mockUnitsSold);
    expect(sold).toEqual([...sold].sort((a, b) => b - a));
    expect(list({ sort: 'popularity' }).data).toEqual(list({ sort: 'popularity:desc' }).data);
    expect(list({ sort: 'rating' }).data).toEqual(list({ sort: 'rating:desc' }).data);
  });

  it('adds meta only for searches, with fuzzy fallback and suggestions', () => {
    expect(list()).not.toHaveProperty('meta');
    expect(list({ q: 'macbook' }).meta).toEqual({ searchMode: 'fts' });

    const fuzzy = list({ q: 'macbok' });
    expect(fuzzy.meta).toEqual({ searchMode: 'fuzzy' });
    expect(fuzzy.data.map((p) => p.slug)).toEqual(['macbook-pro-14-m3']);

    const none = list({ q: 'macbx' });
    expect(none.pagination.totalItems).toBe(0);
    expect(none.meta?.searchMode).toBe('fts');
    expect(none.meta?.suggestions?.[0]).toEqual({
      title: 'MacBook Pro 14 M3',
      slug: 'macbook-pro-14-m3',
    });
    expect(none.meta?.suggestions?.length).toBeLessThanOrEqual(5);

    // Too short for the fuzzy pass: no suggestions, and never an empty array.
    expect(list({ q: 'zq' }).meta).toEqual({ searchMode: 'fts' });
    expect(list({ q: 'zzz-no-match' }).meta).toEqual({ searchMode: 'fts' });
  });

  it('returns facets only with include=facets, each ignoring its own filter', () => {
    expect(list()).not.toHaveProperty('facets');

    const all = list({ include: 'facets' }).facets!;
    expect(all.categories.reduce((sum, term) => sum + term.count, 0)).toBe(products.length);
    expect(all.price.buckets).toHaveLength(9);
    expect(all.price.buckets[0]).toMatchObject({ min: 0, max: 50000 });
    expect(all.price.buckets[8]).toMatchObject({ min: 10000000, max: null });
    expect(all.price.buckets.reduce((sum, b) => sum + b.count, 0)).toBe(products.length);
    expect(all.inStock).toEqual({ true: products.length, false: 0 });

    const electronics = list({ include: 'facets', category: 'electronics' });
    const facets = electronics.facets!;
    // The category facet ignores the category filter...
    expect(facets.categories).toEqual(all.categories);
    // ...but brand, price and stock counts honour it.
    expect(facets.brands.reduce((sum, term) => sum + term.count, 0)).toBe(
      electronics.pagination.totalItems,
    );
    expect(facets.inStock.true).toBe(electronics.pagination.totalItems);
    const counts = facets.categories.map((term) => term.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(facets.categories[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), slug: expect.any(String) }),
    );
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

  it('serve identical facets and search meta for /products', async () => {
    const query = 'include=facets&q=macbx';
    const msw = await fetch(`http://localhost/api/v1/products?${query}`).then((res) => res.json());
    const route = handleMockRequest(
      'products',
      'GET',
      null,
      'parity',
      new URLSearchParams(query),
    ) as Record<string, unknown>;
    expect(msw).toEqual(route);
    expect(msw.meta.suggestions.length).toBeGreaterThan(0);
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
