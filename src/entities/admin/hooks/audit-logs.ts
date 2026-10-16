import { useQuery } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminAuditLogs(
  params: { page?: number; limit?: number; action?: string; resourceType?: string } = {},
) {
  return useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => adminApi.getAuditLogs(params),
    staleTime: STALE_TIME,
  });
}
