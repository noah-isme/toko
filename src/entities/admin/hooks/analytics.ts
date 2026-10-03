import { useQuery } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { AdminAnalyticsRange } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminAnalyticsOverview(range: AdminAnalyticsRange = '30d') {
  return useQuery({
    queryKey: adminKeys.analyticsOverview(range),
    queryFn: () => adminApi.getAnalyticsOverview(range),
    staleTime: STALE_TIME,
  });
}
