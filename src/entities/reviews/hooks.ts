import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useReducer, useRef } from 'react';

import { createReview, getReviewStats, listReviews, voteHelpful } from './api';
import { getReviewListKey, getReviewStatsKey } from './keys';
import type {
  Review,
  ReviewCreateInput,
  ReviewListParams,
  ReviewListResponse,
  ReviewRating,
  ReviewRatingDistribution,
  ReviewStats,
  ReviewVoteDirection,
} from './types';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException, getSentry } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

type ReviewListEntry = [readonly unknown[], ReviewListResponse | undefined];

interface CreateReviewContext {
  previousLists: ReviewListEntry[];
  previousStats?: ReviewStats;
}

interface VoteHelpfulContext {
  previousLists: ReviewListEntry[];
}

function useInFlightRegistry() {
  const registryRef = useRef(new Set<string>());
  const [, forceRender] = useReducer((count) => count + 1, 0);

  const add = useCallback((key: string) => {
    if (registryRef.current.has(key)) {
      return false;
    }

    registryRef.current.add(key);
    forceRender();
    return true;
  }, []);

  const remove = useCallback((key: string) => {
    if (registryRef.current.delete(key)) {
      forceRender();
    }
  }, []);

  const has = useCallback((key: string) => registryRef.current.has(key), []);

  return { add, remove, has };
}

function createTempReviewId() {
  return `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyDistribution(): ReviewRatingDistribution {
  return {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
}

function calculateAverageRating(distribution: ReviewRatingDistribution) {
  const entries = Object.entries(distribution) as [string, number][];
  const { total, sum } = entries.reduce(
    (acc, [rating, count]) => {
      const numericRating = Number(rating) as ReviewRating;
      return {
        total: acc.total + count,
        sum: acc.sum + numericRating * count,
      };
    },
    { total: 0, sum: 0 },
  );

  if (total === 0) {
    return 0;
  }

  return Number((sum / total).toFixed(2));
}

function ensureStats(productId: string, stats?: ReviewStats): ReviewStats {
  if (stats) {
    return stats;
  }

  return {
    productId,
    averageRating: 0,
    totalCount: 0,
    distribution: createEmptyDistribution(),
  };
}

function extractParamsFromKey(key: readonly unknown[]): ReviewListParams | undefined {
  if (Array.isArray(key) && key.length >= 4 && typeof key[3] === 'object' && key[3] !== null) {
    return key[3] as ReviewListParams;
  }

  return undefined;
}

function getListQueries(productId: string, queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.getQueriesData<ReviewListResponse>({
    queryKey: ['reviews', 'list', productId],
  });
}

export function useReviewStatsQuery(productId?: string) {
  const safeProductId = productId ?? '';
  return useQuery<ReviewStats>({
    queryKey: getReviewStatsKey(safeProductId),
    enabled: Boolean(productId),
    queryFn: () => getReviewStats(productId!),
    staleTime: 2 * 60 * 1000,
  });
}

export function useReviewListQuery(productId: string | undefined, params?: ReviewListParams) {
  const safeProductId = productId ?? '';
  const mergedParams = useMemo<Required<ReviewListParams>>(
    () => ({
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
      sort: params?.sort ?? 'recent',
    }),
    [params?.page, params?.pageSize, params?.sort],
  );

  return useQuery<ReviewListResponse>({
    queryKey: getReviewListKey(safeProductId, mergedParams),
    enabled: Boolean(productId),
    queryFn: () => listReviews(productId!, mergedParams),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateReviewMutation(productId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<
    Pick<Review, 'id' | 'status'>,
    Error,
    ReviewCreateInput,
    CreateReviewContext
  >({
    mutationFn: (input) => {
      if (!productId) {
        throw new Error('productId is required to create a review');
      }

      const sentry = getSentry();
      sentry?.addBreadcrumb?.({
        category: 'reviews',
        level: 'info',
        message: 'review:create',
        data: {
          productId,
          rating: input.rating,
        },
      });

      return createReview(productId, input);
    },
    onMutate: async (input) => {
      if (!productId) {
        return { previousLists: [] };
      }

      await queryClient.cancelQueries({ queryKey: ['reviews', 'list', productId] });

      const optimisticReview: Review = {
        id: createTempReviewId(),
        productId,
        author: 'Anda',
        rating: input.rating as ReviewRating,
        body: input.body,
        createdAt: new Date().toISOString(),
        status: 'pending',
        helpfulCount: 0,
        myVote: null,
      };

      const previousLists: ReviewListEntry[] = [];
      const listEntries = getListQueries(productId, queryClient);

      for (const [key, data] of listEntries) {
        const paramsFromKey = extractParamsFromKey(key);
        if (paramsFromKey?.page && paramsFromKey.page > 1) {
          continue;
        }

        previousLists.push([key, data]);
        const baseData: ReviewListResponse =
          data ??
          ({
            data: [],
            meta: {
              page: 1,
              pageSize: paramsFromKey?.pageSize ?? 10,
              total: 0,
              totalPages: 0,
            },
          } satisfies ReviewListResponse);

        const nextMetaTotal = (baseData.meta.total ?? baseData.data.length) + 1;
        const nextItems = [optimisticReview, ...baseData.data];
        const safePageSize = baseData.meta.pageSize || nextItems.length || 1;
        const trimmed = safePageSize > 0 ? nextItems.slice(0, safePageSize) : nextItems;

        const nextData: ReviewListResponse = {
          ...baseData,
          data: trimmed,
          meta: {
            ...baseData.meta,
            total: nextMetaTotal,
            totalPages: Math.max(1, Math.ceil(nextMetaTotal / safePageSize)),
          },
        };

        queryClient.setQueryData(key, nextData);
      }

      const previousStats = queryClient.getQueryData<ReviewStats>(getReviewStatsKey(productId));

      const nextStats = (() => {
        const baseStats = ensureStats(productId, previousStats);
        const updatedDistribution = {
          ...baseStats.distribution,
          [input.rating]: (baseStats.distribution[input.rating as ReviewRating] ?? 0) + 1,
        };
        const nextTotal = baseStats.totalCount + 1;
        return {
          ...baseStats,
          distribution: updatedDistribution,
          totalCount: nextTotal,
          averageRating: calculateAverageRating(updatedDistribution),
        };
      })();

      queryClient.setQueryData(getReviewStatsKey(productId), nextStats);

      return {
        previousLists,
        previousStats,
      };
    },
    onSuccess: (_data, variables) => {
      if (productId) {
        capturePosthogEvent('review_submit', {
          productId,
          rating: variables?.rating,
          bodyLength: variables?.body.length ?? 0,
        });
      }

      toast({
        id: `review-create-${productId}-success`,
        title: 'Ulasan dikirim',
        description: 'Menunggu moderasi sebelum ditampilkan.',
        variant: 'success',
      });
    },
    onError: (error, input, context) => {
      if (productId) {
        for (const [key, data] of context?.previousLists ?? []) {
          queryClient.setQueryData(key, data);
        }

        if (context?.previousStats) {
          queryClient.setQueryData(getReviewStatsKey(productId), context.previousStats);
        } else {
          queryClient.removeQueries({ queryKey: getReviewStatsKey(productId), exact: true });
        }
      }

      captureSentryException(error, {
        tags: { feature: 'reviews', action: 'create' },
        extra: {
          productId,
          rating: input?.rating,
        },
      });

      toast({
        id: `review-create-${productId}-error`,
        title: 'Gagal mengirim ulasan',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      if (!productId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ['reviews', 'list', productId] });
      void queryClient.invalidateQueries({ queryKey: getReviewStatsKey(productId) });
    },
  });

  type CreateMutateOptions = Parameters<typeof mutation.mutate>[1];

  const mutate = useCallback(
    (input: ReviewCreateInput, options?: CreateMutateOptions) => {
      if (!productId) {
        return;
      }

      const guardKey = `create:${productId}`;
      if (!add(guardKey)) {
        return;
      }

      mutation.mutate(input, {
        ...options,
        onSettled: (data, error, variables, context, mutationContext) => {
          remove(guardKey);
          options?.onSettled?.(data, error, variables, context, mutationContext);
        },
      });
    },
    [add, mutation, productId, remove],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      isProductInFlight: () => (productId ? has(`create:${productId}`) : false),
    }),
    [has, mutate, mutation, productId],
  );
}

export function useVoteHelpfulMutation(reviewId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<
    { helpfulCount: number; myVote: Review['myVote'] },
    Error,
    ReviewVoteDirection,
    VoteHelpfulContext
  >({
    mutationFn: (dir) => {
      const sentry = getSentry();
      sentry?.addBreadcrumb?.({
        category: 'reviews',
        level: 'info',
        message: 'review:vote',
        data: {
          reviewId,
          direction: dir,
        },
      });

      return voteHelpful(reviewId, dir);
    },
    onMutate: async (dir) => {
      await queryClient.cancelQueries({ queryKey: ['reviews', 'list'] });

      const previousLists: ReviewListEntry[] = [];
      const listEntries = queryClient.getQueriesData<ReviewListResponse>({
        queryKey: ['reviews', 'list'],
      });

      for (const [key, data] of listEntries) {
        if (!data) {
          continue;
        }

        const index = data.data.findIndex((review) => review.id === reviewId);
        if (index === -1) {
          continue;
        }

        previousLists.push([key, data]);

        const target = data.data[index];
        const nextVote = dir === 'up' ? 'up' : null;
        const voteDelta =
          dir === 'up' ? (target.myVote === 'up' ? 0 : 1) : target.myVote === 'up' ? -1 : 0;
        const nextHelpful = Math.max(0, target.helpfulCount + voteDelta);

        const nextData: ReviewListResponse = {
          ...data,
          data: data.data.map((review, idx) =>
            idx === index
              ? {
                  ...review,
                  helpfulCount: nextHelpful,
                  myVote: nextVote,
                }
              : review,
          ),
        };

        queryClient.setQueryData(key, nextData);
      }

      return { previousLists };
    },
    onError: (error, variables, context) => {
      for (const [key, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, data);
      }

      captureSentryException(error, {
        tags: { feature: 'reviews', action: 'vote' },
        extra: {
          reviewId,
          direction: variables,
        },
      });

      toast({
        id: `review-vote-${reviewId}-error`,
        title: 'Gagal memperbarui vote',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      capturePosthogEvent('review_vote', {
        reviewId,
        direction: variables,
        helpfulCount: data.helpfulCount,
      });

      const listEntries = queryClient.getQueriesData<ReviewListResponse>({
        queryKey: ['reviews', 'list'],
      });

      for (const [key, cached] of listEntries) {
        if (!cached) {
          continue;
        }

        const nextData: ReviewListResponse = {
          ...cached,
          data: cached.data.map((review) =>
            review.id === reviewId
              ? {
                  ...review,
                  helpfulCount: data.helpfulCount,
                  myVote: data.myVote ?? null,
                }
              : review,
          ),
        };

        queryClient.setQueryData(key, nextData);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'list'] });
    },
  });

  type VoteMutateOptions = Parameters<typeof mutation.mutate>[1];

  const mutate = useCallback(
    (dir: ReviewVoteDirection, options?: VoteMutateOptions) => {
      const guardKey = `vote:${reviewId}`;
      if (!add(guardKey)) {
        return;
      }

      mutation.mutate(dir, {
        ...options,
        onSettled: (data, error, variables, context, mutationContext) => {
          remove(guardKey);
          options?.onSettled?.(data, error, variables, context, mutationContext);
        },
      });
    },
    [add, mutation, remove, reviewId],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      isReviewInFlight: () => has(`vote:${reviewId}`),
    }),
    [has, mutate, mutation, reviewId],
  );
}
