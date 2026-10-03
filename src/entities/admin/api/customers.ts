import type { AdminCustomer } from '../types';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse } from '@/lib/api/types';

export const adminCustomersApi = {
  async getCustomers(): Promise<AdminCustomer[]> {
    const response = await apiClient<ApiResponse<AdminCustomer[]>>('/admin/customers', {
      requiresAuth: true,
    });
    return response.data ?? [];
  },
};
