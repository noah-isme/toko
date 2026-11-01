import type { AdminInventoryItem, AdminInventoryParams } from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse } from '@/lib/api/types';

export const adminInventoryApi = {
  /** Every variant of the store (not paginated), optionally filtered by stock status. */
  async getInventory(params: AdminInventoryParams = {}): Promise<AdminInventoryItem[]> {
    const response = await apiClient<ApiResponse<AdminInventoryItem[]>>(
      `/admin/inventory${buildQuery(params)}`,
      { requiresAuth: true },
    );
    return response.data ?? [];
  },

  async updateInventory(id: string, data: { stock?: number; delta?: number }) {
    return apiClient<ApiResponse<AdminInventoryItem>>(`/admin/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },
};
