/**
 * URL search params -> search filters -> product API params, as pure
 * functions shared by the `/products` Server Component (prefetch) and the
 * `AdvancedSearchResults` island (useProducts). Both sides must build the
 * same React Query key, or the hydrated data is ignored and refetched.
 */
import type { SearchFilters, SortOption } from '../types';

import type { ProductFilters, ProductSortOption } from '@/lib/api/types';

export const PRODUCTS_PAGE_SIZE = 12;

/**
 * Upper end of the price filter. A range ending at (or above) this value has
 * no upper bound, and one starting at 0 has no lower bound, so the default
 * `[0, PRICE_FILTER_MAX]` sends neither `minPrice` nor `maxPrice`.
 */
export const PRICE_FILTER_MAX = 10_000_000;

/** GET /products rejects `q` longer than this many code points (400). */
export const MAX_QUERY_LENGTH = 200;

/** The product list request (and `catalogKeys.products` key) for the search UI. */
export type ProductApiParams = ProductFilters;

const SORT_MAP: Partial<Record<SortOption, ProductSortOption>> = {
  'price-asc': 'price:asc',
  'price-desc': 'price:desc',
  'name-asc': 'title:asc',
  'name-desc': 'title:desc',
  popularity: 'popularity:desc',
  rating: 'rating:desc',
};

/** Sorts the product API supports; `relevance` is its default order. */
export function isSupportedSort(value: string | null | undefined): value is SortOption {
  return (
    value === 'relevance' || (!!value && Object.prototype.hasOwnProperty.call(SORT_MAP, value))
  );
}

function listParam(searchParams: URLSearchParams, plural: string, singular: string): string[] {
  // The API filters by one category and one brand, so only the first value
  // is kept. `?category=`/`?brand=` are the links used by the landing pages.
  const raw = searchParams.get(plural) ?? searchParams.get(singular) ?? '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 1);
}

/** Parses `/products?...` search params into the search UI's filter state. */
export function parseSearchStateFromUrl(searchParams: URLSearchParams): SearchFilters {
  const sort = searchParams.get('sort');
  return {
    query: searchParams.get('q') || undefined,
    categories: listParam(searchParams, 'categories', 'category'),
    brands: listParam(searchParams, 'brands', 'brand'),
    priceRange: searchParams.get('price')?.split(',').map(Number) as [number, number] | undefined,
    rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : null,
    inStockOnly: searchParams.get('inStock') === 'true',
    discountOnly: searchParams.get('discount') === 'true',
    sortBy: isSupportedSort(sort) ? sort : 'relevance',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    pageSize: searchParams.get('limit') ? Number(searchParams.get('limit')) : 12,
    attributes: Object.fromEntries(
      Array.from(searchParams.entries())
        .filter(([key]) => key.startsWith('attr_'))
        .map(([key, value]) => [key.replace('attr_', ''), value.split(',').filter(Boolean)]),
    ),
  };
}

/** Trims `q` and caps it at MAX_QUERY_LENGTH code points so the API never rejects it. */
export function toApiQuery(query: string | undefined): string | undefined {
  const trimmed = query?.trim();
  if (!trimmed) return undefined;
  const codePoints = Array.from(trimmed);
  return codePoints.length > MAX_QUERY_LENGTH
    ? codePoints.slice(0, MAX_QUERY_LENGTH).join('').trim()
    : trimmed;
}

/** Maps a `[min, max]` price filter to `minPrice`/`maxPrice`; open ends are omitted. */
export function toApiPriceBounds(
  range: SearchFilters['priceRange'],
): Pick<ProductFilters, 'minPrice' | 'maxPrice'> {
  if (!range) return {};
  const [min, max] = range;
  const minPrice = Number.isFinite(min) && min > 0 ? Math.floor(min) : undefined;
  const maxPrice = Number.isFinite(max) && max < PRICE_FILTER_MAX ? Math.floor(max) : undefined;
  // The API rejects minPrice > maxPrice (400); treat such a range as no filter.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) return {};
  return { minPrice, maxPrice };
}

/**
 * Maps the search UI state to the product list request, always asking for
 * facet counts so the filter sidebar and the grid share one request.
 * Rating and discount filters have no API equivalent and are not sent.
 */
export function toProductApiParams(
  filters: SearchFilters,
  sortBy: SortOption | undefined,
  page: number,
): ProductApiParams {
  return {
    q: toApiQuery(filters.query),
    category: filters.categories?.[0] || undefined,
    brand: filters.brands?.[0] || undefined,
    ...toApiPriceBounds(filters.priceRange),
    inStock: filters.inStockOnly ? true : undefined,
    sort: sortBy ? SORT_MAP[sortBy] : undefined,
    include: 'facets',
    page,
    limit: PRODUCTS_PAGE_SIZE,
  };
}

/** The request `AdvancedSearchResults` makes on first render for this URL. */
export function productApiParamsFromSearchParams(searchParams: URLSearchParams): ProductApiParams {
  const filters = parseSearchStateFromUrl(searchParams);
  return toProductApiParams(filters, filters.sortBy || 'relevance', filters.page || 1);
}

/** Converts a Server Component `searchParams` record into URLSearchParams. */
export function toUrlSearchParams(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) params.append(key, value);
  }
  return params;
}
