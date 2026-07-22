/**
 * In-App Notifications API Service
 *
 * Wraps the `/notifications` endpoints documented in
 * toko-api `docs/contracts/notifications.md`. All endpoints are tenant-scoped
 * and require a Bearer token.
 */
import { apiClient } from '../apiClient';
import type { Notification, PaginatedResponse, UnreadCountResponse } from '../types';

export const notificationsApi = {
  /**
   * List the current user's notifications, most recent first.
   */
  async list(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Notification>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return await apiClient<PaginatedResponse<Notification>>(`/notifications?${params.toString()}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Lightweight unread counter for the navbar badge.
   */
  async unreadCount(): Promise<number> {
    const response = await apiClient<UnreadCountResponse>('/notifications/unread-count', {
      method: 'GET',
      requiresAuth: true,
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
