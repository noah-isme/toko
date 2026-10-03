import { useQuery } from '@tanstack/react-query';

import { catalogKeys } from './keys';

import { catalogApi } from '@/lib/api/services/catalog';
import type { ProductFilters } from '@/lib/api/types';

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => catalogApi.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBrands() {
  return useQuery({
    queryKey: catalogKeys.brands,
    queryFn: () => catalogApi.getBrands(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProducts(filters?: ProductFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: catalogKeys.products(filters),
    queryFn: () => catalogApi.getProducts(filters),
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

export function useProduct(slug: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: () => catalogApi.getProduct(slug),
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

export function useRelatedProducts(slug: string) {
  return useQuery({
    queryKey: catalogKeys.relatedProducts(slug),
    queryFn: () => catalogApi.getRelatedProducts(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFrequentlyBoughtTogether(productId: string) {
  return useQuery({
    queryKey: catalogKeys.frequentlyBoughtTogether(productId),
    queryFn: () => catalogApi.getFrequentlyBoughtTogether(productId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCustomersAlsoViewed(productId: string) {
  return useQuery({
    queryKey: catalogKeys.customersAlsoViewed(productId),
    queryFn: () => catalogApi.getCustomersAlsoViewed(productId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePersonalizedRecommendations(
  limit: number = 10,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...catalogKeys.personalizedRecommendations, limit],
    queryFn: () => catalogApi.getPersonalizedRecommendations(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

export function useTrendingProducts(limit: number = 10, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...catalogKeys.trendingProducts, limit],
    queryFn: () => catalogApi.getTrendingProducts(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}
