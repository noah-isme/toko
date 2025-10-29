import { useQuery } from '@tanstack/react-query';

export {
  useAddToCartMutation,
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/entities/cart/hooks';

import { apiClient } from './apiClient';
import { queryKeys } from './queryKeys';
import { productListSchema, productSchema } from './schemas';
import type { Product, ProductList } from './schemas';

export function useProductsQuery(params?: Record<string, string | number | boolean>) {
  return useQuery<ProductList>({
    queryKey: queryKeys.products(params),
    queryFn: () => {
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          searchParams.set(key, String(value));
        });
        return apiClient(`/products?${searchParams.toString()}`, {
          schema: productListSchema,
        });
      }

      return apiClient('/products', { schema: productListSchema });
    },
  });
}

export function useProductQuery(slug: string) {
  return useQuery<Product>({
    queryKey: queryKeys.product(slug),
    queryFn: () => apiClient(`/products/${slug}`, { schema: productSchema }),
    enabled: Boolean(slug),
  });
}
