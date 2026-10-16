import type { AuditLog } from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';
import type { PaginatedResponse } from '@/lib/api/types';

export const adminAuditLogsApi = {
  async getAuditLogs(
    params: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<PaginatedResponse<AuditLog>> {
    return apiClient<PaginatedResponse<AuditLog>>(`/admin/audit-logs${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },
};
