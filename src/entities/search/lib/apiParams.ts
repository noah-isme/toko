/**
 * URL search params -> search filters -> product API params, as pure
 * functions shared by the `/products` Server Component (prefetch) and the
 * `AdvancedSearchResults` island (useProducts). Both sides must build the
 * same React Query key, or the hydrated data is ignored and refetched.
 */
import type { SearchFilters, SortOption } from '../types';

import type { ProductFilters, ProductSortOption } from '@/lib/api/types';

export const PRODUCTS_PAGE_SIZE = 12;

/** The product list request (and `catalogKeys.products` key) for the search UI. */
export interface ProductApiParams extends ProductFilters {
  categories?: string;
  brands?: string;
  price_min?: number;
  price_max?: number;
  rating_min?: number | null;
  in_stock?: boolean;
  on_sale?: boolean;
}

const SORT_MAP: Partial<Record<SortOption, ProductSortOption>> = {
  'price-asc': 'price:asc',
  'price-desc': 'price:desc',
  'name-asc': 'name:asc',
  'name-desc': 'name:desc',
};

/** Parses `/products?...` search params into the search UI's filter state. */
export function parseSearchStateFromUrl(searchParams: URLSearchParams): SearchFilters {
  return {
    query: searchParams.get('q') || undefined,
    categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
    brands: searchParams.get('brands')?.split(',').filter(Boolean) || [],
    priceRange: searchParams.get('price')?.split(',').map(Number) as [number, number] | undefined,
    rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : null,
    inStockOnly: searchParams.get('inStock') === 'true',
    discountOnly: searchParams.get('discount') === 'true',
    sortBy: (searchParams.get('sort') as SearchFilters['sortBy']) || 'relevance',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    pageSize: searchParams.get('limit') ? Number(searchParams.get('limit')) : 12,
    attributes: Object.fromEntries(
      Array.from(searchParams.entries())
        .filter(([key]) => key.startsWith('attr_'))
        .map(([key, value]) => [key.replace('attr_', ''), value.split(',').filter(Boolean)]),
    ),
  };
}

/** Maps the search UI state to the product list request. */
export function toProductApiParams(
  filters: SearchFilters,
  sortBy: SortOption | undefined,
  page: number,
): ProductApiParams {
  return {
    q: filters.query,
    categories: filters.categories?.join(','),
    brands: filters.brands?.join(','),
    price_min: filters.priceRange?.[0],
    price_max: filters.priceRange?.[1],
    rating_min: filters.rating,
    in_stock: filters.inStockOnly,
    on_sale: filters.discountOnly,
    sort: sortBy ? SORT_MAP[sortBy] : undefined,
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
