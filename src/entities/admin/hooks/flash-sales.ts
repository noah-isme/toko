import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type {
  AdminFlashSaleInput,
  AdminFlashSaleListParams,
  AdminFlashSaleStatus,
  AdminFlashSaleUpdateInput,
} from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminFlashSales(params: AdminFlashSaleListParams = {}) {
  return useQuery({
    queryKey: adminKeys.flashSales(params),
    queryFn: () => adminApi.getFlashSales(params),
    staleTime: STALE_TIME,
  });
}

export function useAdminFlashSale(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.flashSale(id ?? ''),
    queryFn: () => adminApi.getFlashSale(id as string),
    enabled: Boolean(id),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminFlashSaleInput) => adminApi.createFlashSale(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'flash-sales'] });
    },
  });
}

export function useUpdateAdminFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminFlashSaleUpdateInput }) =>
      adminApi.updateFlashSale(id, data),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'flash-sales'] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.flashSale(id) });
    },
  });
}

export function useUpdateAdminFlashSaleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminFlashSaleStatus }) =>
      adminApi.updateFlashSaleStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'flash-sales'] });
    },
  });
}
