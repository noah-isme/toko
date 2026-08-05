import { z } from 'zod';

export interface SearchFacet {
  name: string;
  label: string;
  type: 'category' | 'brand' | 'price' | 'rating' | 'attribute' | 'boolean';
  values: SearchFacetValue[];
  multiSelect?: boolean;
}

export interface SearchFacetValue {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}

export interface SearchFilters {
  query?: string;
  categories?: string[];
  brands?: string[];
  priceRange?: [number, number];
  rating?: number | null;
  inStockOnly?: boolean;
  discountOnly?: boolean;
  sortBy?: SortOption;
  page?: number;
  pageSize?: number;
  attributes?: Record<string, string[]>;
}

export type SortOption =
  | 'relevance'
  | 'name-asc'
  | 'name-desc'
  | 'price-asc'
  | 'price-desc'
  | 'newest'
  | 'oldest'
  | 'rating'
  | 'popularity'
  | 'discount';

export interface SearchResult<T = unknown> {
  data: T[];
  facets: SearchFacet[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  queryTime: number;
  suggestions?: string[];
  correctedQuery?: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
  lastUsedAt?: string;
  alertEnabled?: boolean;
}

export interface SearchSuggestion {
  type: 'query' | 'product' | 'category' | 'brand';
  value: string;
  label: string;
  count?: number;
  image?: string;
}

export const searchFiltersSchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  priceRange: z.tuple([z.number(), z.number()]).optional(),
  rating: z.number().nullable().optional(),
  inStockOnly: z.boolean().optional(),
  discountOnly: z.boolean().optional(),
  sortBy: z.enum([
    'relevance',
    'name-asc',
    'name-desc',
    'price-asc',
    'price-desc',
    'newest',
    'oldest',
    'rating',
    'popularity',
    'discount',
  ]).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
  attributes: z.record(z.string(), z.array(z.string())).optional(),
});

export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'relevance', label: 'Relevansi' },
  { value: 'name-asc', label: 'Nama: A - Z' },
  { value: 'name-desc', label: 'Nama: Z - A' },
  { value: 'price-asc', label: 'Harga: Termurah' },
  { value: 'price-desc', label: 'Harga: Termahal' },
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'rating', label: 'Rating Tertinggi' },
  { value: 'popularity', label: 'Terpopuler' },
  { value: 'discount', label: 'Diskon Terbesar' },
];

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  categories: [],
  brands: [],
  priceRange: [0, 10000000],
  rating: null,
  inStockOnly: false,
  discountOnly: false,
  sortBy: 'relevance',
  page: 1,
  pageSize: 12,
  attributes: {},
};

export function buildSearchUrl(filters: SearchFilters, basePath = '/products'): string {
  const params = new URLSearchParams();
  
  if (filters.query) params.set('q', filters.query);
  if (filters.categories?.length) params.set('categories', filters.categories.join(','));
  if (filters.brands?.length) params.set('brands', filters.brands.join(','));
  if (filters.priceRange) params.set('price', `${filters.priceRange[0]},${filters.priceRange[1]}`);
  if (filters.rating !== null && filters.rating !== undefined) params.set('rating', filters.rating.toString());
  if (filters.inStockOnly) params.set('inStock', 'true');
  if (filters.discountOnly) params.set('discount', 'true');
  if (filters.sortBy && filters.sortBy !== 'relevance') params.set('sort', filters.sortBy);
  if (filters.page && filters.page > 1) params.set('page', filters.page.toString());
  if (filters.pageSize && filters.pageSize !== 12) params.set('limit', filters.pageSize.toString());
  if (filters.attributes) {
    Object.entries(filters.attributes).forEach(([key, values]) => {
      if (values.length) params.set(`attr_${key}`, values.join(','));
    });
  }
  
  return `${basePath}?${params.toString()}`;
}

export function parseSearchUrl(searchParams: URLSearchParams): SearchFilters {
  return {
    query: searchParams.get('q') || undefined,
    categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
    brands: searchParams.get('brands')?.split(',').filter(Boolean) || [],
    priceRange: searchParams.get('price')?.split(',').map(Number) as [number, number] | undefined,
    rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : null,
    inStockOnly: searchParams.get('inStock') === 'true',
    discountOnly: searchParams.get('discount') === 'true',
    sortBy: (searchParams.get('sort') as SortOption) || 'relevance',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    pageSize: searchParams.get('limit') ? Number(searchParams.get('limit')) : 12,
    attributes: Object.fromEntries(
      Array.from(searchParams.entries())
        .filter(([key]) => key.startsWith('attr_'))
        .map(([key, value]) => [key.replace('attr_', ''), value.split(',').filter(Boolean)])
    ),
  };
}

export function getActiveFilterCount(filters: SearchFilters): number {
  let count = 0;
  if (filters.query) count++;
  if (filters.categories?.length) count += filters.categories.length;
  if (filters.brands?.length) count += filters.brands.length;
  if (filters.rating) count++;
  if (filters.inStockOnly) count++;
  if (filters.discountOnly) count++;
  if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000000)) count++;
  if (filters.attributes) {
    Object.values(filters.attributes).forEach((values) => {
      count += values.length;
    });
  }
  return count;
}