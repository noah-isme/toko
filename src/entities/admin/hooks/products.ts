import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { AdminProductInput, AdminProductListParams } from '../types';

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useUpdateAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminProductInput }) =>
      adminApi.updateProduct(id, data),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.product(id) });
    },
  });
}

export function useDeleteAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useUpdateAdminProductStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock, inStock }: { id: string; stock?: number; inStock?: boolean }) =>
      adminApi.updateProductStock(id, { stock, inStock }),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.product(id) });
    },
  });
}
