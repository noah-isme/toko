/**
 * In-App Notifications API Service
 *
 * Wraps the `/notifications` endpoints documented in
 * toko-api `docs/contracts/notifications.md`. All endpoints are tenant-scoped
 * and require a Bearer token.
 */
import { z, type ZodType } from 'zod';

import { apiClient } from '../apiClient';
import type { Notification, PaginatedResponse, UnreadCountResponse } from '../types';

const notificationSchema: ZodType<Notification> = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.object({}).passthrough(),
  read: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

const apiNotificationListSchema = z.object({
  data: z.array(notificationSchema),
  pagination: z.object({
    page: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
  }),
});

const unreadCountResponseSchema: ZodType<UnreadCountResponse> = z.object({
  unread: z.number().int().nonnegative(),
});

const markReadResponseSchema = z.object({
  read: z.boolean(),
});

export const notificationsApi = {
  /**
   * List the current user's notifications, most recent first.
   */
  async list(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Notification>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiClient(`/notifications?${params.toString()}`, {
      method: 'GET',
      requiresAuth: true,
      schema: apiNotificationListSchema,
    });

    return {
      data: response.data,
      pagination: response.pagination,
    };
  },

  /**
   * Lightweight unread counter for the navbar badge.
   */
  async unreadCount(): Promise<number> {
    const response = await apiClient('/notifications/unread-count', {
      method: 'GET',
      requiresAuth: true,
      schema: unreadCountResponseSchema,
    });
    return response.unread;
  },

  /**
   * Mark a single notification as read. Idempotent server-side.
   */
  async markRead(id: string): Promise<void> {
    await apiClient(`/notifications/${id}/read`, {
      method: 'POST',
      requiresAuth: true,
      schema: markReadResponseSchema,
    });
  },

  /**
   * Mark every unread notification as read. Returns 204.
   */
  async markAllRead(): Promise<void> {
    await apiClient('/notifications/read-all', {
      method: 'POST',
      requiresAuth: true,
    });
  },
};
