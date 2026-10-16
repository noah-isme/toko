import type { ProductFilters } from '@/lib/api/types';

export const catalogKeys = {
  categories: ['catalog', 'categories'] as const,
  brands: ['catalog', 'brands'] as const,
  products: (filters?: ProductFilters) => ['catalog', 'products', filters] as const,
  product: (slug: string) => ['catalog', 'product', slug] as const,
  relatedProducts: (slug: string) => ['catalog', 'relatedProducts', slug] as const,
  frequentlyBoughtTogether: (productId: string) =>
    ['catalog', 'frequentlyBoughtTogether', productId] as const,
  customersAlsoViewed: (productId: string) =>
    ['catalog', 'customersAlsoViewed', productId] as const,
  personalizedRecommendations: ['catalog', 'personalizedRecommendations'] as const,
  trendingProducts: ['catalog', 'trendingProducts'] as const,
};
