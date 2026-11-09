import { hashKey } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { catalogKeys } from '@/entities/catalog/keys';
import {
  MAX_QUERY_LENGTH,
  parseSearchStateFromUrl,
  productApiParamsFromSearchParams,
  toApiQuery,
  toUrlSearchParams,
} from '@/entities/search/lib/apiParams';
import { AdvancedSearchResults } from '@/entities/search/ui/AdvancedSearchResults';

const nav = vi.hoisted(() => ({ search: '' }));
const useProductsMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/products',
}));
vi.mock('@/entities/catalog/hooks', () => ({ useProducts: useProductsMock }));
vi.mock('@/entities/search/ui/AdvancedFilterSidebar', () => ({
  AdvancedFilterSidebar: () => null,
}));

const SAMPLES = [
  '',
  'q=macbook',
  'price=100000,5000000',
  'brands=apple,sony&categories=electronics',
  'sort=price-desc&page=2',
  'q=sepatu&inStock=true&discount=true&rating=4&sort=name-asc',
  'sort=popularity',
  'sort=rating&categories=electronics&brands=apple',
  'category=home-living&brand=ikea',
  'price=10000000,10000000',
  'sort=oldest',
];

/** What the /products Server Component prefetches for `?search` (Next passes a record). */
function serverKey(search: string) {
  const record: Record<string, string | string[] | undefined> = {};
  new URLSearchParams(search).forEach((value, key) => {
    const existing = record[key];
    record[key] =
      existing === undefined ? value : ([] as string[]).concat(existing as string, value);
  });
  return catalogKeys.products(productApiParamsFromSearchParams(toUrlSearchParams(record)));
}

/** What the AdvancedSearchResults island passes to useProducts on first render. */
function clientKey(search: string) {
  nav.search = search;
  useProductsMock.mockClear();
  render(<AdvancedSearchResults />);
  const [params] = useProductsMock.mock.calls[0];
  return catalogKeys.products(params);
}

describe('products query key parity (server prefetch vs client island)', () => {
  beforeEach(() => {
    useProductsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
      refetch: vi.fn(),
    });
  });

  it.each(SAMPLES)('hashes equal for /products?%s', (search) => {
    expect(hashKey(serverKey(search))).toBe(hashKey(clientKey(search)));
  });

  it('maps URL filters to API params', () => {
    expect(
      productApiParamsFromSearchParams(new URLSearchParams('q=tv&sort=price-asc&page=3')),
    ).toMatchObject({ q: 'tv', sort: 'price:asc', page: 3, limit: 12, include: 'facets' });
  });

  it('uses the product API parameter names for every filter', () => {
    const params = productApiParamsFromSearchParams(
      new URLSearchParams(
        'q=%20kursi%20&categories=home-living,fashion&brands=ikea&price=50000,99999&inStock=true',
      ),
    );
    expect(params).toEqual({
      q: 'kursi',
      category: 'home-living',
      brand: 'ikea',
      minPrice: 50000,
      maxPrice: 99999,
      inStock: true,
      sort: undefined,
      include: 'facets',
      page: 1,
      limit: 12,
    });
  });

  it('accepts the singular category/brand links used by the landing pages', () => {
    expect(
      productApiParamsFromSearchParams(new URLSearchParams('category=electronics&brand=apple')),
    ).toMatchObject({ category: 'electronics', brand: 'apple' });
  });

  it.each([
    ['popularity', 'popularity:desc'],
    ['rating', 'rating:desc'],
    ['name-asc', 'title:asc'],
    ['name-desc', 'title:desc'],
    ['price-desc', 'price:desc'],
    ['relevance', undefined],
    ['oldest', undefined],
  ])('maps sort=%s to %s', (sort, expected) => {
    expect(productApiParamsFromSearchParams(new URLSearchParams({ sort })).sort).toBe(expected);
  });

  it('omits open price bounds and invalid ranges', () => {
    const bounds = (price: string) => {
      const { minPrice, maxPrice } = productApiParamsFromSearchParams(
        new URLSearchParams({ price }),
      );
      return { minPrice, maxPrice };
    };
    expect(bounds('0,10000000')).toEqual({ minPrice: undefined, maxPrice: undefined });
    expect(bounds('10000000,10000000')).toEqual({ minPrice: 10000000, maxPrice: undefined });
    expect(bounds('0,49999')).toEqual({ minPrice: undefined, maxPrice: 49999 });
    expect(bounds('500,100')).toEqual({ minPrice: undefined, maxPrice: undefined });
    expect(bounds('abc,def')).toEqual({ minPrice: undefined, maxPrice: undefined });
  });

  it('normalises unsupported sorts to relevance in the filter state', () => {
    expect(parseSearchStateFromUrl(new URLSearchParams('sort=discount')).sortBy).toBe('relevance');
    expect(parseSearchStateFromUrl(new URLSearchParams('sort=toString')).sortBy).toBe('relevance');
    expect(parseSearchStateFromUrl(new URLSearchParams('sort=popularity')).sortBy).toBe(
      'popularity',
    );
  });

  it('caps q at 200 code points so the API never rejects it', () => {
    const long = '😀'.repeat(250);
    const q = toApiQuery(long)!;
    expect(Array.from(q)).toHaveLength(MAX_QUERY_LENGTH);
    expect(toApiQuery('   ')).toBeUndefined();
  });
});
