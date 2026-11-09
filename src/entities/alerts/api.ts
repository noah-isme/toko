import { z, type ZodType } from 'zod';

import type {
  AlertListParams,
  AlertListResponse,
  AlertSubscribeInput,
  AlertSubscription,
} from './types';

import { apiClient } from '@/lib/api/apiClient';

const alertSubscriptionSchema: ZodType<AlertSubscription> = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().nullable(),
  type: z.enum(['BACK_IN_STOCK', 'PRICE_DROP']),
  priceAtSubscribe: z.number().nullable(),
  status: z.enum(['active', 'notified']),
  notifiedAt: z.string().nullable(),
  createdAt: z.string(),
  product: z.object({
    title: z.string(),
    slug: z.string(),
    thumbnail: z.string().nullable(),
    price: z.number(),
    inStock: z.boolean(),
  }),
  variant: z
    .object({
      id: z.string(),
      sku: z.string().nullable(),
      price: z.number(),
      stock: z.number(),
    })
    .optional(),
});

const alertListResponseSchema: ZodType<AlertListResponse> = z.object({
  data: z.array(alertSubscriptionSchema),
  pagination: z.object({
    page: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
  }),
});

const alertResponseSchema = z.object({ data: alertSubscriptionSchema });

export async function listAlerts(params: AlertListParams = {}): Promise<AlertListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.productId) search.set('productId', params.productId);
  const query = search.toString();

  return apiClient(query ? `/alerts?${query}` : '/alerts', {
    method: 'GET',
    requiresAuth: true,
    schema: alertListResponseSchema,
  });
}

/** Creates the subscription (201) or re-arms an existing one (200). */
export async function subscribeAlert(input: AlertSubscribeInput): Promise<AlertSubscription> {
  const body: Record<string, string> = { productId: input.productId, type: input.type };
  if (input.variantId) body.variantId = input.variantId;

  const response = await apiClient('/alerts', {
    method: 'POST',
    body: JSON.stringify(body),
    requiresAuth: true,
    schema: alertResponseSchema,
  });
  return response.data;
}

export async function deleteAlert(id: string): Promise<void> {
  await apiClient(`/alerts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}
