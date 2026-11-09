import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { AdminProductInput, AdminProductListParams } from '../types';

import { invalidateCatalog } from './catalog-ops';
import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminProducts(params: AdminProductListParams = {}) {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: () => adminApi.getProducts(params),
    staleTime: STALE_TIME,
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.product(id ?? ''),
    queryFn: () => adminApi.getProduct(id as string),
    enabled: Boolean(id),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminProductInput) => adminApi.createProduct(data),
    // New products add inventory rows and can change the dashboard stock counts.
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useUpdateAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminProductInput }) =>
      adminApi.updateProduct(id, data),
    // Status and low-stock threshold edits change inventory rows and dashboard counts.
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useDeleteAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useUpdateAdminProductStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock, inStock }: { id: string; stock?: number; inStock?: boolean }) =>
      adminApi.updateProductStock(id, { stock, inStock }),
    // Quick stock edits move the inventory list and the dashboard low-stock cards.
    onSuccess: () => invalidateCatalog(queryClient),
  });
}
