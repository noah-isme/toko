import { z, type ZodType } from 'zod';

import { apiClient } from '../apiClient';
import type {
  AnalyticsQueryParams,
  SalesAnalyticsRow,
  TopProductsAnalyticsRow,
  OffsetPaginatedResponse,
} from '../types';

const salesAnalyticsRowSchema: ZodType<SalesAnalyticsRow> = z.object({
  day: z.string(),
  paidOrders: z.number(),
  allOrders: z.number(),
  revenue: z.number(),
});

const topProductsAnalyticsRowSchema: ZodType<TopProductsAnalyticsRow> = z.object({
  productId: z.string(),
  qtySold: z.number(),
  gross: z.number(),
});

const salesAnalyticsResponseSchema = z.object({
  data: z.array(salesAnalyticsRowSchema),
});

const topProductsAnalyticsResponseSchema = z.object({
  data: z.array(topProductsAnalyticsRowSchema),
});

export const analyticsApi = {
  /** Get sales analytics (admin) — supports RFC3339 `from`/`to` or relative `days` */
  async getSales(params?: AnalyticsQueryParams): Promise<SalesAnalyticsRow[]> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.days) searchParams.set('days', params.days.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient(`/analytics/sales${query}`, {
      method: 'GET',
      requiresAuth: true,
      schema: salesAnalyticsResponseSchema,
    }).then((res) => res.data);
  },

  /** Get top products analytics (admin) — offset-based pagination */
  async getTopProducts(params?: AnalyticsQueryParams): Promise<TopProductsAnalyticsRow[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient(`/analytics/top-products${query}`, {
      method: 'GET',
      requiresAuth: true,
      schema: topProductsAnalyticsResponseSchema,
    }).then((res) => res.data);
  },

  /** Get analytics overview (admin) — currently returns 501 Not Implemented */
  async getOverview(): Promise<never> {
    return apiClient('/analytics/overview', {
      method: 'GET',
      requiresAuth: true,
    }).then(() => {
      throw new Error('Analytics overview not implemented');
    });
  },
};
