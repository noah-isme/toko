import { useQuery } from '@tanstack/react-query';

import { apiClient } from './apiClient';
import { mapApiProductToProduct } from './mappers/product';
import { queryKeys } from './queryKeys';
import { productSchema } from './schemas';
import type { Product, ProductList } from './schemas';
import type { ApiProduct, ApiProductListResponse, ApiResponse } from './types';

export {
  useAddToCartMutation,
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/entities/cart/hooks';

export function useProductsQuery(params?: Record<string, string | number | boolean>) {
  return useQuery<ProductList>({
    queryKey: queryKeys.products(params),
    queryFn: async () => {
      let path = '/products';
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          searchParams.set(key, String(value));
        });
        path += `?${searchParams.toString()}`;
      }

      // Fetch raw data (ApiProductListResponse)
      const response = await apiClient<ApiProductListResponse>(path);

      // Map to Entity (Product[])
      return response.data.map(mapApiProductToProduct);
    },
  });
}

export function useProductQuery(slug: string) {
  return useQuery<Product>({
    queryKey: queryKeys.product(slug),
    queryFn: async () => {
      const response = await apiClient<ApiResponse<ApiProduct>>(`/products/${slug}`);
      return mapApiProductToProduct(response.data);
    },
    enabled: Boolean(slug),
  });
}
