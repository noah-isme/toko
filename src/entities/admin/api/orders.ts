import type {
  AdminOrder,
  AdminOrderDetail,
  AdminOrderListParams,
  AdminOrderStats,
  AdminOrderStatus,
  ShipmentData,
} from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types';

export const adminOrdersApi = {
  async getOrders(params: AdminOrderListParams = {}): Promise<PaginatedResponse<AdminOrder>> {
    return apiClient<PaginatedResponse<AdminOrder>>(`/admin/orders${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },

  async getOrder(id: string): Promise<AdminOrderDetail> {
    const response = await apiClient<ApiResponse<AdminOrderDetail>>(`/admin/orders/${id}`, {
      requiresAuth: true,
    });
    return response.data;
  },

  async getOrderStats(
    params: { startDate?: string; endDate?: string } = {},
  ): Promise<AdminOrderStats> {
    const response = await apiClient<ApiResponse<AdminOrderStats>>(
      `/admin/orders/stats${buildQuery(params)}`,
      { requiresAuth: true },
    );
    return response.data;
  },

  async updateOrderStatus(id: string, status: AdminOrderStatus): Promise<void> {
    await apiClient<void>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      requiresAuth: true,
    });
  },

  async createShipment(orderId: string, data: ShipmentData): Promise<unknown> {
    return apiClient<unknown>(`/admin/orders/${orderId}/shipment`, {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },
};
