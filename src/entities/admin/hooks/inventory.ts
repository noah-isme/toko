import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { AdminInventoryParams } from '../types';

export function useAdminInventory(
  params: AdminInventoryParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: adminKeys.inventory(params),
    queryFn: () => adminApi.getInventory(params),
    enabled: options.enabled ?? true,
    staleTime: 15_000,
  });
}

export function useUpdateAdminInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { stock?: number; delta?: number } }) =>
      adminApi.updateInventory(id, data),
    onSuccess: () => {
      // Prefix keys: adminKeys.inventory()/products() end in `undefined`, which
      // does not prefix-match keys that carry filter params.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
}
