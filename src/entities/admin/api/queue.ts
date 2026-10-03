import type { DeadLetterEntry, DeadLetterReplayResult, QueueKind, QueueStats } from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';

export const adminQueueApi = {
  /**
   * Queue metrics are per kind, so `kind` is required. The handler responds with
   * a bare object rather than the `{data}` envelope used elsewhere.
   */
  async getQueueStats(kind: QueueKind): Promise<QueueStats> {
    return apiClient<QueueStats>(`/admin/queue/stats${buildQuery({ kind })}`, {
      requiresAuth: true,
    });
  },

  async getDeadLetterQueue(
    params: { kind?: QueueKind; limit?: number; offset?: number } = {},
  ): Promise<{ data: DeadLetterEntry[]; total: number }> {
    const response = await apiClient<{ data: DeadLetterEntry[]; total: number }>(
      `/admin/queue/dlq${buildQuery(params)}`,
      { requiresAuth: true },
    );
    return { data: response.data ?? [], total: response.total ?? 0 };
  },

  /** Replays specific entries by id, or a whole kind in batches of `limit`. */
  async replayDeadLetter(body: {
    ids?: string[];
    kind?: QueueKind;
    limit?: number;
  }): Promise<DeadLetterReplayResult> {
    return apiClient<DeadLetterReplayResult>('/admin/queue/dlq/replay', {
      method: 'POST',
      body: JSON.stringify(body),
      requiresAuth: true,
    });
  },
};
