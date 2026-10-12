import type {
  AdminFlashSale,
  AdminFlashSaleInput,
  AdminFlashSaleListParams,
  AdminFlashSaleStatus,
  AdminFlashSaleStatusUpdate,
  AdminFlashSaleUpdateInput,
} from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types';

export const adminFlashSalesApi = {
  async getFlashSales(
    params: AdminFlashSaleListParams = {},
  ): Promise<PaginatedResponse<AdminFlashSale>> {
    return apiClient<PaginatedResponse<AdminFlashSale>>(`/admin/flash-sales${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },

  async getFlashSale(id: string): Promise<AdminFlashSale> {
    const response = await apiClient<ApiResponse<AdminFlashSale>>(`/admin/flash-sales/${id}`, {
      requiresAuth: true,
    });
    return response.data;
  },

  async createFlashSale(data: AdminFlashSaleInput): Promise<{ id: string }> {
    const response = await apiClient<ApiResponse<{ id: string }>>('/admin/flash-sales', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async updateFlashSale(id: string, data: AdminFlashSaleUpdateInput): Promise<AdminFlashSale> {
    const response = await apiClient<ApiResponse<AdminFlashSale>>(`/admin/flash-sales/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async updateFlashSaleStatus(
    id: string,
    status: AdminFlashSaleStatus,
  ): Promise<AdminFlashSaleStatusUpdate> {
    const response = await apiClient<ApiResponse<AdminFlashSaleStatusUpdate>>(
      `/admin/flash-sales/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        requiresAuth: true,
      },
    );
    return response.data;
  },
};
