import { z, type ZodType } from 'zod';

import type { SearchFilters, SearchResult, SearchFacet, SavedSearch, SearchSuggestion } from './types';

import { apiClient } from '@/lib/api/apiClient';

const searchFacetValueSchema: ZodType<SearchFacet['values'][0]> = z.object({
  value: z.string(),
  label: z.string(),
  count: z.number(),
  selected: z.boolean().optional(),
});

const searchFacetSchema: ZodType<SearchFacet> = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['category', 'brand', 'price', 'rating', 'attribute', 'boolean']),
  values: z.array(searchFacetValueSchema),
  multiSelect: z.boolean().optional(),
});

const searchResultSchema = <T extends ZodType>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    facets: z.array(searchFacetSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
    queryTime: z.number(),
    suggestions: z.array(z.string()).optional(),
    correctedQuery: z.string().optional(),
  });

const savedSearchSchema: ZodType<SavedSearch> = z.object({
  id: z.string(),
  name: z.string(),
  filters: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
  alertEnabled: z.boolean().optional(),
});

const searchSuggestionSchema: ZodType<SearchSuggestion> = z.object({
  type: z.enum(['query', 'product', 'category', 'brand']),
  value: z.string(),
  label: z.string(),
  count: z.number().optional(),
  image: z.string().optional(),
});

export const searchApi = {
  /**
   * Perform a search with filters and faceted results
   */
  async search<T>(filters: SearchFilters, dataSchema: ZodType<T>): Promise<SearchResult<T>> {
    const params = new URLSearchParams();
    
    if (filters.query) params.set('q', filters.query);
    if (filters.categories?.length) params.set('categories', filters.categories.join(','));
    if (filters.brands?.length) params.set('brands', filters.brands.join(','));
    if (filters.priceRange) params.set('price_min', filters.priceRange[0].toString());
    if (filters.priceRange) params.set('price_max', filters.priceRange[1].toString());
    if (filters.rating !== null && filters.rating !== undefined) params.set('rating_min', filters.rating.toString());
    if (filters.inStockOnly) params.set('in_stock', 'true');
    if (filters.discountOnly) params.set('on_sale', 'true');
    if (filters.sortBy) params.set('sort', filters.sortBy);
    if (filters.page) params.set('page', filters.page.toString());
    if (filters.pageSize) params.set('limit', filters.pageSize.toString());
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([key, values]) => {
        if (values.length) params.set(`attr_${key}`, values.join(','));
      });
    }

    const response = await apiClient(`/search?${params.toString()}`, {
      method: 'GET',
      schema: searchResultSchema(dataSchema),
    });

    return response;
  },

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(query: string, limit = 10): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) return [];
    
    const response = await apiClient(`/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`, {
      method: 'GET',
      schema: z.array(searchSuggestionSchema),
    });

    return response;
  },

  /**
   * Get available facets for a search query (without full results)
   */
  async getFacets(filters: SearchFilters): Promise<SearchFacet[]> {
    const params = new URLSearchParams();
    
    if (filters.query) params.set('q', filters.query);
    if (filters.categories?.length) params.set('categories', filters.categories.join(','));
    if (filters.brands?.length) params.set('brands', filters.brands.join(','));
    if (filters.priceRange) params.set('price_min', filters.priceRange[0].toString());
    if (filters.priceRange) params.set('price_max', filters.priceRange[1].toString());

    const response = await apiClient(`/search/facets?${params.toString()}`, {
      method: 'GET',
      schema: z.array(searchFacetSchema),
    });

    return response;
  },

  /**
   * Save a search for later use
   */
  async saveSearch(name: string, filters: SearchFilters, alertEnabled = false): Promise<SavedSearch> {
    const response = await apiClient('/search/saved', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ name, filters, alertEnabled }),
      schema: savedSearchSchema,
    });

    return response;
  },

  /**
   * Get user's saved searches
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    const response = await apiClient('/search/saved', {
      method: 'GET',
      requiresAuth: true,
      schema: z.array(savedSearchSchema),
    });

    return response;
  },

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(id: string): Promise<void> {
    await apiClient(`/search/saved/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Toggle alert for a saved search
   */
  async toggleSavedSearchAlert(id: string, enabled: boolean): Promise<SavedSearch> {
    const response = await apiClient(`/search/saved/${id}/alert`, {
      method: 'PATCH',
      requiresAuth: true,
      body: JSON.stringify({ alertEnabled: enabled }),
      schema: savedSearchSchema,
    });

    return response;
  },

  /**
   * Get popular/trending searches
   */
  async getTrendingSearches(limit = 10): Promise<SearchSuggestion[]> {
    const response = await apiClient(`/search/trending?limit=${limit}`, {
      method: 'GET',
      schema: z.array(searchSuggestionSchema),
    });

    return response;
  },

  /**
   * Get recent searches for the current user
   */
  async getRecentSearches(limit = 10): Promise<SearchSuggestion[]> {
    const response = await apiClient(`/search/recent?limit=${limit}`, {
      method: 'GET',
      requiresAuth: true,
      schema: z.array(searchSuggestionSchema),
    });

    return response;
  },
};