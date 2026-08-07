import { z, type ZodType } from 'zod';

import type {
  PushSubscription,
  PushSubscriptionInput,
  PushSubscriptionResponse,
  VapidPublicKeyResponse,
  PushPreferences,
} from './types';

import { apiClient } from '@/lib/api/apiClient';

const vapidPublicKeySchema: ZodType<VapidPublicKeyResponse> = z.object({
  publicKey: z.string(),
});

const pushSubscriptionResponseSchema: ZodType<PushSubscriptionResponse> = z.object({
  success: z.boolean(),
  message: z.string(),
});

const pushPreferencesSchema: ZodType<PushPreferences> = z.object({
  enabled: z.boolean(),
  types: z.record(z.string(), z.boolean()),
  endpoint: z.string().optional(),
});

export const webPushApi = {
  /**
   * Get the VAPID public key for client-side subscription.
   */
  async getVapidPublicKey(): Promise<string> {
    const response = await apiClient('/push/vapid-key', {
      method: 'GET',
      requiresAuth: true,
      schema: vapidPublicKeySchema,
    });
    return response.publicKey;
  },

  /**
   * Subscribe the current user to push notifications.
   */
  async subscribe(input: PushSubscriptionInput): Promise<PushSubscriptionResponse> {
    const response = await apiClient('/push/subscription', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(input),
      schema: pushSubscriptionResponseSchema,
    });
    return response;
  },

  /**
   * Unsubscribe the current user from push notifications.
   */
  async unsubscribe(endpoint?: string): Promise<PushSubscriptionResponse> {
    const params = endpoint ? new URLSearchParams({ endpoint }) : undefined;
    const response = await apiClient(`/push/subscription${params ? `?${params.toString()}` : ''}`, {
      method: 'DELETE',
      requiresAuth: true,
      schema: pushSubscriptionResponseSchema,
    });
    return response;
  },

  /**
   * Get the current user's push notification preferences.
   */
  async getPreferences(): Promise<PushPreferences> {
    const response = await apiClient('/push/preferences', {
      method: 'GET',
      requiresAuth: true,
      schema: pushPreferencesSchema,
    });
    return response;
  },

  /**
   * Update the current user's push notification preferences.
   */
  async updatePreferences(
    preferences: Partial<PushPreferences>,
  ): Promise<PushSubscriptionResponse> {
    const response = await apiClient('/push/preferences', {
      method: 'PATCH',
      requiresAuth: true,
      body: JSON.stringify(preferences),
      schema: pushSubscriptionResponseSchema,
    });
    return response;
  },

  /**
   * Send a test push notification (for debugging).
   */
  async sendTestNotification(): Promise<PushSubscriptionResponse> {
    const response = await apiClient('/push/send-test', {
      method: 'POST',
      requiresAuth: true,
      schema: pushSubscriptionResponseSchema,
    });
    return response;
  },
};
