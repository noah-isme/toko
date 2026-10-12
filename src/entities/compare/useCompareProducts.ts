'use client';

import { useMemo } from 'react';

import { useProducts } from '@/entities/catalog/hooks';
import type { Product } from '@/lib/api';
import { useCompareStore } from '@/stores/compare-store';

export interface UseCompareProductsResult {
  /** Selected products, in the order they were added. Unknown ids are skipped. */
  products: Product[];
  productIds: string[];
  isLoading: boolean;
}

/**
 * Resolves the ids held in the compare store to full Product objects using the
 * already-cached product catalogue, preserving selection order.
 */
export function useCompareProducts(): UseCompareProductsResult {
  const productIds = useCompareStore((state) => state.productIds);
  // The compare bar is mounted on every storefront page: only fetch the
  // catalogue once something is selected, so pages do not pay for it (and
  // server-hydrated pages like /products make no extra product request).
  const { data: rawProductsData, isLoading } = useProducts(undefined, {
    enabled: productIds.length > 0,
  });
  const catalogue = rawProductsData?.data;

  const products = useMemo(() => {
    if (!catalogue) {
      return [];
    }
    const byId = new Map(catalogue.map((product) => [product.id, product]));
    return productIds
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [catalogue, productIds]);

  return { products, productIds, isLoading };
}
