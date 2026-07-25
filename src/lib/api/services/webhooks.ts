import { z, type ZodType } from 'zod';

import { apiClient } from '../apiClient';
import type {
  WebhookEndpoint,
  WebhookDelivery,
  WebhookDlq,
  CreateWebhookEndpointRequest,
  UpdateWebhookEndpointRequest,
  ListWebhookEndpointsParams,
  ListWebhookDeliveriesParams,
  ReplayDlqRequest,
  OffsetLimitPagination,
  OffsetPaginatedResponse,
} from '../types';

const webhookEndpointSchema: ZodType<WebhookEndpoint> = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  secret: z.string(),
  active: z.boolean(),
  topics: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  tenantId: z.string(),
});

const webhookDeliverySchema: ZodType<WebhookDelivery> = z.object({
  id: z.string(),
  endpointId: z.string(),
  eventId: z.string(),
  status: z.union([z.literal('pending'), z.literal('delivered'), z.literal('failed')]),
  attempt: z.number(),
  maxAttempt: z.number(),
  nextAttemptAt: z.string().optional(),
  lastError: z.string().optional(),
  responseStatus: z.number().optional(),
  responseBody: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tenantId: z.string(),
});

const webhookDlqSchema: ZodType<WebhookDlq> = z.object({
  id: z.string(),
  kind: z.string(),
  idempotencyKey: z.string(),
  attempts: z.number(),
  lastError: z.string(),
  createdAt: z.string(),
  message: z.object({
    kind: z.string(),
    key: z.string(),
    payload: z.record(z.string(), z.any()),
    attempt: z.number(),
    maxAttempts: z.number(),
    availableAt: z.number(),
  }),
});

const webhookEndpointListSchema = z.object({
  data: z.array(webhookEndpointSchema),
  total: z.number().optional(),
});

const webhookDeliveryListSchema = z.object({
  data: z.array(webhookDeliverySchema),
  total: z.number().optional(),
});

const webhookDlqListSchema = z.object({
  data: z.array(webhookDlqSchema),
  total: z.number().optional(),
});

export const webhooksApi = {
  /** Create a new webhook endpoint (admin) */
  async create(data: CreateWebhookEndpointRequest): Promise<WebhookEndpoint> {
    return apiClient('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
      schema: z.object({ data: webhookEndpointSchema }),
    }).then((res) => res.data);
  },

  /** List webhook endpoints (admin) — offset-based pagination, max limit 200 */
  async list(
    params?: ListWebhookEndpointsParams,
  ): Promise<OffsetPaginatedResponse<WebhookEndpoint>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient(`/webhooks${query}`, {
      method: 'GET',
      requiresAuth: true,
      schema: webhookEndpointListSchema,
    });
  },

  /** Get a webhook endpoint by ID (admin) */
  async get(id: string): Promise<WebhookEndpoint> {
    return apiClient(`/webhooks/${encodeURIComponent(id)}`, {
      method: 'GET',
      requiresAuth: true,
      schema: z.object({ data: webhookEndpointSchema }),
    }).then((res) => res.data);
  },

  /** Update a webhook endpoint (admin) */
  async update(id: string, data: UpdateWebhookEndpointRequest): Promise<WebhookEndpoint> {
    return apiClient(`/webhooks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true,
      schema: z.object({ data: webhookEndpointSchema }),
    }).then((res) => res.data);
  },

  /** Delete a webhook endpoint (admin) */
  async delete(id: string): Promise<void> {
    await apiClient(`/webhooks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /** List webhook deliveries for an endpoint (admin) — offset-based pagination */
  async listDeliveries(
    params?: ListWebhookDeliveriesParams,
  ): Promise<OffsetPaginatedResponse<WebhookDelivery>> {
    const searchParams = new URLSearchParams();
    if (params?.endpointId) searchParams.set('endpointId', params.endpointId);
    if (params?.eventId) searchParams.set('eventId', params.eventId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient(`/webhooks/deliveries${query}`, {
      method: 'GET',
      requiresAuth: true,
      schema: webhookDeliveryListSchema,
    });
  },

  /** Replay a failed delivery by ID (admin) */
  async replayDelivery(id: string): Promise<WebhookDelivery> {
    return apiClient(`/webhooks/deliveries/${encodeURIComponent(id)}/replay`, {
      method: 'POST',
      requiresAuth: true,
      schema: z.object({ data: webhookDeliverySchema }),
    }).then((res) => res.data);
  },

  /** List DLQ entries (admin) */
  async listDlq(params?: OffsetLimitPagination): Promise<OffsetPaginatedResponse<WebhookDlq>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient(`/queue/dlq${query}`, {
      method: 'GET',
      requiresAuth: true,
      schema: webhookDlqListSchema,
    });
  },

  /** Replay DLQ entries (admin) */
  async replayDlq(request: ReplayDlqRequest): Promise<void> {
    await apiClient('/queue/dlq/replay', {
      method: 'POST',
      body: JSON.stringify(request),
      requiresAuth: true,
      schema: z.void(),
    });
  },

  /** Get queue statistics (admin) */
  async getQueueStats(kind?: string): Promise<{
    ready: number;
    processing: number;
    dlq: number;
    oldestLagMs: number;
    visibilityTimeout: number;
  }> {
    const query = kind ? `?kind=${encodeURIComponent(kind)}` : '';
    return apiClient(`/queue/stats${query}`, {
      method: 'GET',
      requiresAuth: true,
      schema: z.object({
        data: z.object({
          ready: z.number(),
          processing: z.number(),
          dlq: z.number(),
          oldestLagMs: z.number(),
          visibilityTimeout: z.number(),
        }),
      }),
    }).then((res) => res.data);
  },
};
