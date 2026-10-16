import { hashKey } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { catalogKeys } from '@/entities/catalog/keys';
import {
  productApiParamsFromSearchParams,
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
    ).toMatchObject({ q: 'tv', sort: 'price:asc', page: 3, limit: 12 });
  });
});
