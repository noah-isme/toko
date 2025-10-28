"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { apiClient } from "./apiClient";
import { cartSchema, productsResponseSchema, productSchema } from "./schemas";
import { queryKeys } from "./queryKeys";
import type { Cart, Product, ProductsQueryParams, ProductsResponse } from "./types";

const buildProductSearchParams = (params?: ProductsQueryParams) => {
  if (!params?.search) return undefined;
  return { search: params.search } as Record<string, string>;
};

export const useProductsQuery = (
  params?: ProductsQueryParams,
): UseQueryResult<ProductsResponse, Error> =>
  useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => {
      const searchParams = buildProductSearchParams(params);
      if (searchParams) {
        return apiClient.get("products", productsResponseSchema, {
          searchParams,
        }) as Promise<ProductsResponse>;
      }
      return apiClient.get("products", productsResponseSchema) as Promise<ProductsResponse>;
    },
  });

export const useProductQuery = (slug: string | undefined): UseQueryResult<Product, Error> =>
  useQuery({
    enabled: Boolean(slug),
    queryKey: queryKeys.product(slug ?? ""),
    queryFn: () => apiClient.get(`products/${slug}`, productSchema) as Promise<Product>,
  });

export const useCartQuery = (): UseQueryResult<Cart, Error> =>
  useQuery({
    queryKey: queryKeys.cart(),
    queryFn: () => apiClient.get("cart", cartSchema) as Promise<Cart>,
  });
