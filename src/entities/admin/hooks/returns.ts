import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminOperationsApi } from '../api';
import { adminKeys } from '../keys';
import type { ReturnStatus } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminReturns() {
  return useQuery({
    queryKey: adminKeys.returns(),
    queryFn: () => adminOperationsApi.listReturns(),
    staleTime: STALE_TIME,
  });
}

export function useUpdateAdminReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReturnStatus }) =>
      adminOperationsApi.updateReturn(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.returns() });
    },
  });
}

export function useRefundAdminReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminOperationsApi.refundReturn(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.returns() });
    },
  });
}
