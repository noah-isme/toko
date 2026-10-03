import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { AdminWebhookEndpointInput } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminWebhooks() {
  return useQuery({
    queryKey: adminKeys.webhooks(),
    queryFn: () => adminApi.getWebhooks(),
    staleTime: STALE_TIME,
  });
}

export function useAdminWebhookDeliveries(
  params: { page?: number; limit?: number; endpointId?: string; status?: string } = {},
) {
  return useQuery({
    queryKey: adminKeys.webhookDeliveries(params),
    queryFn: () => adminApi.getWebhookDeliveries(params),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminWebhookEndpointInput) => adminApi.createWebhook(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.webhooks() });
    },
  });
}

export function useUpdateAdminWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminWebhookEndpointInput }) =>
      adminApi.updateWebhook(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.webhooks() });
    },
  });
}

export function useDeleteAdminWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.webhooks() });
    },
  });
}

export function useReplayAdminWebhookDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.replayWebhookDelivery(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'webhook-deliveries'] });
    },
  });
}
