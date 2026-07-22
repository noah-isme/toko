'use client';

import { useMemo } from 'react';

import { useProducts } from '@/lib/api';
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
  const { data: rawProductsData, isLoading } = useProducts();
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
