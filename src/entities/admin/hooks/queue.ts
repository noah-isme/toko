import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { QueueKind } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

/** Queue depth moves constantly, so poll instead of relying on the stale window. */
const QUEUE_REFETCH_INTERVAL = 10_000;

export function useAdminQueueStats(kind: QueueKind) {
  return useQuery({
    queryKey: adminKeys.queueStats(kind),
    queryFn: () => adminApi.getQueueStats(kind),
    refetchInterval: QUEUE_REFETCH_INTERVAL,
  });
}

export function useAdminDeadLetterQueue(
  params: { kind?: QueueKind; limit?: number; offset?: number } = {},
) {
  return useQuery({
    queryKey: adminKeys.deadLetters(params),
    queryFn: () => adminApi.getDeadLetterQueue(params),
    staleTime: STALE_TIME,
  });
}

export function useReplayDeadLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids?: string[]; kind?: QueueKind; limit?: number }) =>
      adminApi.replayDeadLetter(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] });
    },
  });
}
