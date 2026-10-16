import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { AdminVoucherInput, AdminVoucherListParams } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminVouchers(params: AdminVoucherListParams = {}) {
  return useQuery({
    queryKey: adminKeys.vouchers(params),
    queryFn: () => adminApi.getVouchers(params),
    staleTime: STALE_TIME,
  });
}

export function useAdminVoucherStats() {
  return useQuery({
    queryKey: adminKeys.voucherStats(),
    queryFn: () => adminApi.getVoucherStats(),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminVoucherInput) => adminApi.createVoucher(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    },
  });
}

export function useUpdateAdminVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: AdminVoucherInput }) =>
      adminApi.updateVoucher(code, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    },
  });
}

export function useDeleteAdminVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => adminApi.deleteVoucher(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    },
  });
}
