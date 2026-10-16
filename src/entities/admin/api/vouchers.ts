import type {
  AdminVoucher,
  AdminVoucherInput,
  AdminVoucherListParams,
  AdminVoucherStats,
} from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types';

export const adminVouchersApi = {
  async getVouchers(params: AdminVoucherListParams = {}): Promise<PaginatedResponse<AdminVoucher>> {
    return apiClient<PaginatedResponse<AdminVoucher>>(`/admin/vouchers${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },

  async getVoucherStats(): Promise<AdminVoucherStats> {
    const response = await apiClient<ApiResponse<AdminVoucherStats>>('/admin/vouchers/stats', {
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Created by the voucher handler, which echoes the raw DB row (snake_case) and
   * not the camelCase list DTO. Callers refetch the list instead of using the
   * response body, so it is intentionally untyped.
   */
  async createVoucher(data: AdminVoucherInput): Promise<void> {
    await apiClient<unknown>('/admin/vouchers', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /** The backend keys vouchers by code, not id, and uses PUT for a full replace. */
  async updateVoucher(code: string, data: AdminVoucherInput): Promise<void> {
    await apiClient<unknown>(`/admin/vouchers/${code}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  async deleteVoucher(code: string): Promise<void> {
    await apiClient<void>(`/admin/vouchers/${code}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
