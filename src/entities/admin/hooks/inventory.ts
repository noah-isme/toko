import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
export function useAdminInventory() {
  return useQuery({
    queryKey: adminKeys.inventory(),
    queryFn: () => adminApi.getInventory(),
    staleTime: 15_000,
  });
}

export function useUpdateAdminInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { stock?: number; delta?: number } }) =>
      adminApi.updateInventory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.inventory() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}
