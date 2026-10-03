import type { StoreSettings } from '../types';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse } from '@/lib/api/types';

export const adminSettingsApi = {
  async getSettings(): Promise<StoreSettings> {
    const response = await apiClient<ApiResponse<StoreSettings>>('/admin/settings', {
      requiresAuth: true,
    });
    return response.data ?? {};
  },

  async updateSettings(settings: StoreSettings): Promise<StoreSettings> {
    const response = await apiClient<ApiResponse<StoreSettings>>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
      requiresAuth: true,
    });
    return response.data ?? {};
  },
};
