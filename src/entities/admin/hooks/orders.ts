import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { AdminOrderListParams, AdminOrderStatus, ShipmentData } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminOrders(params: AdminOrderListParams = {}) {
  return useQuery({
    queryKey: adminKeys.orders(params),
    queryFn: () => adminApi.getOrders(params),
    staleTime: STALE_TIME,
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.order(id ?? ''),
    queryFn: () => adminApi.getOrder(id as string),
    enabled: Boolean(id),
    staleTime: STALE_TIME,
  });
}

export function useAdminOrderStats(params: { startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: adminKeys.orderStats(params),
    queryFn: () => adminApi.getOrderStats(params),
    staleTime: STALE_TIME,
  });
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminOrderStatus }) =>
      adminApi.updateOrderStatus(id, status),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.order(id) });
    },
  });
}

export function useCreateAdminShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, courier, trackingNumber }: { orderId: string } & ShipmentData) =>
      adminApi.createShipment(orderId, { courier, trackingNumber }),
    onSuccess: (_result, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.order(orderId) });
    },
  });
}
