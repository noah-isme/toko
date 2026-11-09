import type { RoleDefinition, StaffAssignInput, StaffMember, StaffRole } from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types';

/** Staff RBAC endpoints (`staff:read` to list, `staff:manage` to change). */
export const adminStaffApi = {
  async getRoles(): Promise<RoleDefinition[]> {
    const response = await apiClient<ApiResponse<RoleDefinition[]>>('/admin/roles', {
      requiresAuth: true,
    });
    return response.data ?? [];
  },

  async getStaff(
    params: { page?: number; limit?: number } = {},
  ): Promise<PaginatedResponse<StaffMember>> {
    return apiClient<PaginatedResponse<StaffMember>>(`/admin/staff${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },

  async assignStaff(input: StaffAssignInput): Promise<StaffMember> {
    const response = await apiClient<ApiResponse<StaffMember>>('/admin/staff', {
      method: 'POST',
      body: JSON.stringify(input),
      requiresAuth: true,
    });
    return response.data;
  },

  async updateStaffRole(userId: string, role: StaffRole): Promise<StaffMember> {
    const response = await apiClient<ApiResponse<StaffMember>>(
      `/admin/staff/${encodeURIComponent(userId)}`,
      { method: 'PATCH', body: JSON.stringify({ role }), requiresAuth: true },
    );
    return response.data;
  },

  /** Sets the member back to `customer`; they keep their storefront account. */
  async revokeStaff(userId: string): Promise<void> {
    await apiClient<void>(`/admin/staff/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
