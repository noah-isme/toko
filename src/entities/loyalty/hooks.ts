import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { getLoyaltyProfile, getLoyaltyTransactions, redeemReward } from './api';
import { getLoyaltyProfileKey, getLoyaltyTransactionsKey } from './keys';
import type {
  LoyaltyProfile,
  LoyaltyTransaction,
  LoyaltyTransactionListParams,
  LoyaltyTransactionListResponse,
  RedeemRewardInput,
} from './types';
import { REWARD_CATALOG } from './types';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

export function useLoyaltyProfileQuery() {
  return useQuery({
    queryKey: getLoyaltyProfileKey(),
    queryFn: getLoyaltyProfile,
  });
}

export function useLoyaltyTransactionsQuery(params?: LoyaltyTransactionListParams) {
  return useQuery({
    queryKey: getLoyaltyTransactionsKey(params),
    queryFn: () => getLoyaltyTransactions(params),
  });
}

export function useRedeemRewardMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation<
    { success: boolean; message: string; remainingPoints: number; transaction?: LoyaltyTransaction },
    Error,
    RedeemRewardInput,
    unknown
  >({
    mutationFn: redeemReward,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: getLoyaltyProfileKey() });
      await queryClient.cancelQueries({ queryKey: ['loyalty', 'transactions'] });

      const previousProfile = queryClient.getQueryData<LoyaltyProfile>(getLoyaltyProfileKey());
      const previousTransactions = queryClient.getQueriesData<LoyaltyTransactionListResponse>({
        queryKey: ['loyalty', 'transactions'],
      });

      // Optimistically update profile points
      if (previousProfile) {
        const reward = REWARD_CATALOG.find((r) => r.id === input.rewardId);
        if (reward) {
          queryClient.setQueryData(getLoyaltyProfileKey(), {
            ...previousProfile,
            points: previousProfile.points - reward.pointsCost,
          });
        }
      }

      return { previousProfile, previousTransactions };
    },
    onSuccess: (data, variables) => {
      const reward = REWARD_CATALOG.find((r) => r.id === variables.rewardId);
      
      capturePosthogEvent('loyalty_redeem', {
        rewardId: variables.rewardId,
        rewardName: reward?.name,
        pointsCost: reward?.pointsCost,
      });

      toast({
        id: `loyalty-redeem-success`,
        title: 'Hadiah berhasil diklaim',
        description: data.message,
        variant: 'success',
      });
    },
    onError: (error, _variables, context) => {
      const ctx = context as { previousProfile?: LoyaltyProfile; previousTransactions?: Array<[unknown[], LoyaltyTransactionListResponse | undefined]> } | undefined;
      if (ctx?.previousProfile) {
        queryClient.setQueryData(getLoyaltyProfileKey(), ctx.previousProfile);
      }
      if (ctx?.previousTransactions) {
        for (const [key, data] of ctx.previousTransactions) {
          queryClient.setQueryData(key, data);
        }
      }

      captureSentryException(error, {
        tags: { feature: 'loyalty', action: 'redeem' },
      });

      toast({
        id: `loyalty-redeem-error`,
        title: 'Gagal menukarkan hadiah',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: getLoyaltyProfileKey() });
      void queryClient.invalidateQueries({ queryKey: ['loyalty', 'transactions'] });
    },
  });

  return useMemo(
    () => ({
      ...mutation,
      redeem: mutation.mutate,
      redeemAsync: mutation.mutateAsync,
    }),
    [mutation],
  );
}