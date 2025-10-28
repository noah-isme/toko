import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { OrderDetailSchema, OrderListItemSchema, type OrderDetail } from '../schemas';

import { fetchWithCreds, type ApiError } from '@/entities/checkout/api/client';
import { queryKeys } from '@/lib/api/queryKeys';

const ordersQueryParamsSchema = z.object({
  status: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

const ordersListResponseSchema = z.object({
  data: z.array(OrderListItemSchema),
  meta: z
    .object({
      page: z.number().int().nonnegative().default(1),
      limit: z.number().int().positive().default(10),
      total: z.number().int().nonnegative().optional(),
      totalPages: z.number().int().nonnegative().optional(),
    })
    .default({ page: 1, limit: 10 }),
});

export type OrdersQueryParams = z.infer<typeof ordersQueryParamsSchema>;
export type OrdersListResponse = z.infer<typeof ordersListResponseSchema>;

const orderIdSchema = z.string().min(1, 'orderId is required');

export function useOrdersQuery(params?: OrdersQueryParams) {
  return useQuery<OrdersListResponse, ApiError>({
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
      const path = queryString ? `/orders?${queryString}` : '/orders';
      return fetchWithCreds(path, { schema: ordersListResponseSchema });
    },
  });
}

export function useOrderQuery(orderId: string) {
  return useQuery<OrderDetail, ApiError>({
    queryKey: queryKeys.order(orderId),
    enabled: Boolean(orderId),
    queryFn: async () => {
      const parsed = orderIdSchema.parse(orderId);
      return fetchWithCreds(`/orders/${parsed}`, { schema: OrderDetailSchema });
    },
  });
}
