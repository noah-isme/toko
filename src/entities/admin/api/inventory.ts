import type { AdminInventoryItem } from '../types';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse } from '@/lib/api/types';

export const adminInventoryApi = {
  async getInventory(): Promise<AdminInventoryItem[]> {
    const response = await apiClient<ApiResponse<AdminInventoryItem[]>>('/admin/inventory', {
      requiresAuth: true,
    });
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
