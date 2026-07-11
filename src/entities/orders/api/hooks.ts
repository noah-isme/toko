import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import { type ApiResponse } from '@/lib/api/types';
import { queryKeys } from '@/lib/api/queryKeys';
import { ordersApi } from '@/lib/api/services';
import { OrderDetailSchema, OrderListItemSchema, type OrderDetail, type OrderListItem } from '../schemas';

const ordersQueryParamsSchema = z.object({
  status: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

const ordersListResponseSchema = z.object({
  data: z.array(OrderListItemSchema),
  meta: z.object({
    page: z.number().int().nonnegative().default(1),
    limit: z.number().int().positive().default(10),
    total: z.number().int().nonnegative().optional(),
    totalPages: z.number().int().nonnegative().optional(),
  }).optional(),
  // Support legacy 'pagination' field too
  pagination: z.object({
    page: z.number().int().nonnegative().default(1),
    perPage: z.number().int().positive().default(10),
    totalItems: z.number().int().nonnegative().optional(),
  }).optional(),
}).passthrough();

export type OrdersQueryParams = z.infer<typeof ordersQueryParamsSchema>;
export type OrdersListResponse = z.infer<typeof ordersListResponseSchema>;

export function useOrdersQuery(params?: OrdersQueryParams) {
  return useQuery<OrdersListResponse, ApiClientError>({
    queryKey: queryKeys.orders(params ?? {}),
    queryFn: async () => {
      const filters = ordersQueryParamsSchema.parse(params ?? {});
      const searchParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      const response = await apiClient<ApiResponse<any>>(
        queryString ? `/orders?${queryString}` : '/orders',
        { requiresAuth: true }
      );

      // Map API response to our schema structure if needed, or parse directly
      // Contract says response is { data: [...], pagination: {...} }
      return ordersListResponseSchema.parse(response);
    },
  });
}

export function useOrderQuery(orderId: string) {
  return useQuery<OrderDetail, ApiClientError>({
    queryKey: queryKeys.order(orderId),
    enabled: Boolean(orderId),
    queryFn: async () => {
      const response = await apiClient<ApiResponse<any>>(`/orders/${orderId}`, {
        requiresAuth: true
      });
      // Contract says response is { data: { ... } } or direct object
      const payload = response?.data ?? response;
      return OrderDetailSchema.parse(payload);
    },
  });
}

export function useCancelOrderMutation(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ordersApi.cancelOrder(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
