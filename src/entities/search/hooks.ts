import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { searchApi } from './api';
import type { SearchFilters, SearchFacet, SearchResult, SearchSuggestion, SavedSearch } from './types';
import { SORT_OPTIONS } from './types';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

export { SORT_OPTIONS };

const SEARCH_KEYS_BASE = ['search'] as const;

type SearchKeys = {
  all: readonly ['search'];
  results: (filters: SearchFilters) => readonly unknown[];
  facets: (filters: SearchFilters) => readonly unknown[];
  suggestions: (query: string) => readonly unknown[];
  trending: readonly ['search', 'trending'];
  recent: readonly ['search', 'recent'];
  saved: readonly ['search', 'saved'];
};

export const searchKeys: SearchKeys = {
  all: SEARCH_KEYS_BASE,
  results: (filters: SearchFilters) => [...SEARCH_KEYS_BASE, 'results', filters] as const,
  facets: (filters: SearchFilters) => [...SEARCH_KEYS_BASE, 'facets', filters] as const,
  suggestions: (query: string) => [...SEARCH_KEYS_BASE, 'suggestions', query] as const,
  trending: [...SEARCH_KEYS_BASE, 'trending'] as const,
  recent: [...SEARCH_KEYS_BASE, 'recent'] as const,
  saved: [...SEARCH_KEYS_BASE, 'saved'] as const,
};

export function useSearchQuery<T>(filters: SearchFilters, dataSchema: unknown, options?: { enabled?: boolean }) {
  return useQuery<SearchResult<T>>({
    queryKey: searchKeys.results(filters),
    queryFn: () => searchApi.search(filters, dataSchema as any),
    enabled: options?.enabled !== false && (!!filters.query || !!filters.categories?.length || !!filters.brands?.length),
    placeholderData: (previousData) => previousData,
  });
}

export function useSearchFacetsQuery(filters: SearchFilters, options?: { enabled?: boolean }) {
  return useQuery<SearchFacet[]>({
    queryKey: searchKeys.facets(filters),
    queryFn: () => searchApi.getFacets(filters),
    enabled: options?.enabled !== false && (!!filters.query || !!filters.categories?.length || !!filters.brands?.length),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSearchSuggestionsQuery(query: string, limit = 10) {
  return useQuery<SearchSuggestion[]>({
    queryKey: searchKeys.suggestions(query),
    queryFn: () => searchApi.getSuggestions(query, limit),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useTrendingSearchesQuery(limit = 10) {
  return useQuery<SearchSuggestion[]>({
    queryKey: searchKeys.trending,
    queryFn: () => searchApi.getTrendingSearches(limit),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useRecentSearchesQuery(limit = 10) {
  return useQuery<SearchSuggestion[]>({
    queryKey: searchKeys.recent,
    queryFn: () => searchApi.getRecentSearches(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSavedSearchesQuery() {
  return useQuery<SavedSearch[]>({
    queryKey: searchKeys.saved,
    queryFn: searchApi.getSavedSearches,
  });
}

export function useSaveSearchMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ name, filters, alertEnabled }: { name: string; filters: SearchFilters; alertEnabled?: boolean }) =>
      searchApi.saveSearch(name, filters, alertEnabled),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: searchKeys.saved });
      capturePosthogEvent('search_save', { searchId: data.id, name: data.name });
      toast({
        id: 'search-save-success',
        title: 'Pencarian disimpan',
        description: `"${data.name}" telah disimpan untuk akses cepat`,
        variant: 'success',
      });
    },
    onError: (error) => {
      captureSentryException(error, { tags: { feature: 'search', action: 'save' } });
      toast({
        id: 'search-save-error',
        title: 'Gagal menyimpan pencarian',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSavedSearchMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => searchApi.deleteSavedSearch(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: searchKeys.saved });
      capturePosthogEvent('search_delete', { searchId: id });
      toast({
        id: 'search-delete-success',
        title: 'Pencarian dihapus',
        description: 'Pencarian tersimpan telah dihapus',
        variant: 'success',
      });
    },
    onError: (error) => {
      captureSentryException(error, { tags: { feature: 'search', action: 'delete' } });
      toast({
        id: 'search-delete-error',
        title: 'Gagal menghapus pencarian',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useToggleSavedSearchAlertMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => searchApi.toggleSavedSearchAlert(id, enabled),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: searchKeys.saved });
      const previous = queryClient.getQueryData<SavedSearch[]>(searchKeys.saved);
      
      if (previous) {
        queryClient.setQueryData(searchKeys.saved, previous.map((s) => 
          s.id === id ? { ...s, alertEnabled: enabled } : s
        ));
      }
      return { previous };
    },
    onSuccess: (data) => {
      capturePosthogEvent('search_alert_toggle', { searchId: data.id, enabled: data.alertEnabled });
      toast({
        id: 'search-alert-success',
        title: data.alertEnabled ? 'Notifikasi diaktifkan' : 'Notifikasi dinonaktifkan',
        description: `Anda akan ${data.alertEnabled ? '' : 'tidak '}menerima notifikasi untuk pencarian ini`,
        variant: 'success',
      });
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(searchKeys.saved, context.previous);
      }
      captureSentryException(error, { tags: { feature: 'search', action: 'toggle_alert' } });
      toast({
        id: 'search-alert-error',
        title: 'Gagal mengubah notifikasi',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.saved });
    },
  });
}

export function useSearchUrl(filters: SearchFilters, basePath = '/products') {
  return useMemo(() => {
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
  }, [filters, basePath]);
}

/**
 * Plain function version of search URL builder for use outside React hooks context
 * (e.g., inside useCallback callbacks)
 */
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

export function useSearchStateFromUrl(searchParams: URLSearchParams): SearchFilters {
  return useMemo(() => {
    return parseSearchStateFromUrl(searchParams);
  }, [searchParams.toString()]);
}

/**
 * Plain function version of search state parser for use outside React hooks context
 * (e.g., inside useEffect callbacks)
 */
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
        .map(([key, value]) => [key.replace('attr_', ''), value.split(',').filter(Boolean)])
    ),
  };
}

export function useActiveFilterCount(filters: SearchFilters) {
  return useMemo(() => {
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
  }, [filters]);
}