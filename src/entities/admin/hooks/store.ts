import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
export function useAdminCustomers() {
  return useQuery({
    queryKey: adminKeys.customers(),
    queryFn: () => adminApi.getCustomers(),
    staleTime: 30_000,
  });
}

export function useStoreSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: () => adminApi.getSettings(),
    staleTime: 30_000,
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, unknown>) => adminApi.updateSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(adminKeys.settings(), data);
    },
  });
}
