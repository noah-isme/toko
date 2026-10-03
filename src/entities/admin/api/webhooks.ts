import type {
  AdminWebhookDelivery,
  AdminWebhookEndpoint,
  AdminWebhookEndpointInput,
} from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';

export const adminWebhooksApi = {
  async getWebhooks(
    params: { page?: number; limit?: number } = {},
  ): Promise<AdminWebhookEndpoint[]> {
    const response = await apiClient<{ data: AdminWebhookEndpoint[] }>(
      `/admin/webhooks${buildQuery(params)}`,
      { requiresAuth: true },
    );
    return response.data ?? [];
  },

  async createWebhook(data: AdminWebhookEndpointInput): Promise<AdminWebhookEndpoint> {
    return apiClient<AdminWebhookEndpoint>('/admin/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /** Full replace: name, url, secret and topics must all be supplied. */
  async updateWebhook(id: string, data: AdminWebhookEndpointInput): Promise<AdminWebhookEndpoint> {
    return apiClient<AdminWebhookEndpoint>(`/admin/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  async deleteWebhook(id: string): Promise<void> {
    await apiClient<void>(`/admin/webhooks/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async getWebhookDeliveries(
    params: { page?: number; limit?: number; endpointId?: string; status?: string } = {},
  ): Promise<{ data: AdminWebhookDelivery[]; total: number }> {
    const response = await apiClient<{ data: AdminWebhookDelivery[]; total: number }>(
      `/admin/webhook-deliveries${buildQuery(params)}`,
      { requiresAuth: true },
    );
    return { data: response.data ?? [], total: response.total ?? 0 };
  },

  async replayWebhookDelivery(id: string): Promise<AdminWebhookDelivery> {
    return apiClient<AdminWebhookDelivery>(`/admin/webhook-deliveries/${id}/replay`, {
      method: 'POST',
      requiresAuth: true,
    });
  },
};
