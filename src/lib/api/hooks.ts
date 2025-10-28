import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from './apiClient';
import { queryKeys } from './queryKeys';
import { addToCartInputSchema, cartSchema, productListSchema, productSchema } from './schemas';
import type { AddToCartInput, Cart, Product, ProductList } from './schemas';

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

export function useCartQuery() {
  return useQuery<Cart>({
    queryKey: queryKeys.cart(),
    queryFn: () => apiClient('/cart', { schema: cartSchema }),
  });
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();

  return useMutation<Cart, Error, AddToCartInput>({
    mutationFn: async (input) =>
      apiClient('/cart/items', {
        method: 'POST',
        body: JSON.stringify(addToCartInputSchema.parse(input)),
        schema: cartSchema,
      }),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(), cart);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}
