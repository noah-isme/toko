import type { AdminAnalyticsOverview, AdminAnalyticsRange } from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse } from '@/lib/api/types';

export const adminAnalyticsApi = {
  async getAnalyticsOverview(range: AdminAnalyticsRange = '30d'): Promise<AdminAnalyticsOverview> {
    const response = await apiClient<ApiResponse<AdminAnalyticsOverview>>(
      `/admin/analytics/overview${buildQuery({ range })}`,
      { requiresAuth: true },
    );
    return response.data;
  },
};
