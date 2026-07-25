import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCapturePosthogEvent, mockCaptureSentryException, mockAddBreadcrumb } = vi.hoisted(
  () => ({
    mockCapturePosthogEvent: vi.fn(),
    mockCaptureSentryException: vi.fn(),
    mockAddBreadcrumb: vi.fn(),
  }),
);

vi.mock('@/shared/telemetry/posthog', () => ({
  capturePosthogEvent: mockCapturePosthogEvent,
  getPosthog: vi.fn(() => null),
}));

vi.mock('@/shared/telemetry/sentry', () => ({
  captureSentryException: mockCaptureSentryException,
  getSentry: () => ({
    addBreadcrumb: mockAddBreadcrumb,
  }),
}));

import {
  useCreateReviewMutation,
  useReviewListQuery,
  useReviewStatsQuery,
  useVoteHelpfulMutation,
} from '@/entities/reviews/hooks';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function withQueryClient(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('reviews hooks optimistic updates', () => {
  const productId = 'product-optimistic';

  beforeEach(() => {
    mockCapturePosthogEvent.mockClear();
    mockCaptureSentryException.mockClear();
    mockAddBreadcrumb.mockClear();
  });

  it('optimistically inserts a pending review and updates stats before the server responds', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: listResult } = renderHook(
      () => useReviewListQuery(productId, { page: 1, pageSize: 3, sort: 'recent' }),
      { wrapper: Wrapper },
    );
    await waitFor(() => {
      expect(listResult.current.data).toBeDefined();
    });
    const initialList = listResult.current.data!;

    const { result: statsResult } = renderHook(() => useReviewStatsQuery(productId), {
      wrapper: Wrapper,
    });
    await waitFor(() => {
      expect(statsResult.current.data).toBeDefined();
    });
    const initialStats = statsResult.current.data!;

    let resolveCreate!: () => void;
    const createBlocker = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });

    server.use(
      http.post(apiPath('/products/:productId/reviews'), async () => {
        await createBlocker;
        return HttpResponse.json(
          {
            id: 'server-review',
            product_id: productId,
            user_id: 'user-optimistic',
            rating: 5,
            comment: 'Produk ini sangat membantu aktivitas saya sehari-hari.',
            created_at: '2026-07-24T10:00:00Z',
            updated_at: '2026-07-24T10:00:00Z',
            tenant_id: 'tenant-optimistic',
          },
          { status: 201 },
        );
      }),
    );

    const { result: mutationResult } = renderHook(() => useCreateReviewMutation(productId), {
      wrapper: Wrapper,
    });

    act(() => {
      mutationResult.current.mutate({
        rating: 5,
        body: 'Produk ini sangat membantu aktivitas saya sehari-hari.',
      });
    });

    // Wait for onMutate to run (optimistic update in cache) before server responds
    await waitFor(() => {
      const list = listResult.current.data;
      expect(list?.data[0].id).toMatch(/^temp-/);
    });

    const optimisticList = listResult.current.data!;
    expect(optimisticList.data[0].id).toMatch(/^temp-/);
    expect(optimisticList.data[0].status).toBe('pending');
    expect(optimisticList.meta.total).toBe((initialList.meta.total ?? initialList.data.length) + 1);

    const optimisticStats = statsResult.current.data!;
    expect(optimisticStats.totalCount).toBe(initialStats.totalCount + 1);
    expect(optimisticStats.distribution[5]).toBe(initialStats.distribution[5] + 1);

    // Unblock the server response
    act(() => {
      resolveCreate();
    });

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'review:create', category: 'reviews' }),
    );
    expect(mockCapturePosthogEvent).toHaveBeenCalledWith(
      'review_submit',
      expect.objectContaining({
        productId,
        rating: 5,
      }),
    );
  });

  it('rolls back optimistic review changes on failure and reports telemetry', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: listResult } = renderHook(
      () => useReviewListQuery(productId, { page: 1, pageSize: 2, sort: 'recent' }),
      { wrapper: Wrapper },
    );
    await waitFor(() => {
      expect(listResult.current.data).toBeDefined();
    });
    const baselineList = listResult.current.data!;

    const { result: statsResult } = renderHook(() => useReviewStatsQuery(productId), {
      wrapper: Wrapper,
    });
    await waitFor(() => {
      expect(statsResult.current.data).toBeDefined();
    });
    const baselineStats = statsResult.current.data!;

    server.use(
      http.post(apiPath('/products/:productId/reviews'), async () => {
        await delay(50);
        return HttpResponse.json({ message: 'boom' }, { status: 500 });
      }),
    );

    const { result: mutationResult } = renderHook(() => useCreateReviewMutation(productId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate({
        rating: 4,
        body: 'Cukup baik namun pengiriman agak lambat.',
      });
    });

    await waitFor(() => {
      expect(mutationResult.current.isError).toBe(true);
    });

    expect(listResult.current.data).toEqual(baselineList);
    expect(statsResult.current.data).toEqual(baselineStats);
    expect(mockCapturePosthogEvent).not.toHaveBeenCalled();
    expect(mockCaptureSentryException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ action: 'create', feature: 'reviews' }),
      }),
    );
  });

  it('optimistically toggles helpful votes and emits telemetry', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: listResult } = renderHook(
      () => useReviewListQuery(productId, { page: 1, pageSize: 3, sort: 'recent' }),
      { wrapper: Wrapper },
    );
    await waitFor(() => {
      expect(listResult.current.data).toBeDefined();
    });

    const targetReview = listResult.current.data!.data[0];
    const targetReviewId = targetReview.id;
    const baseHelpful = targetReview.helpfulCount;

    let resolveVote!: () => void;
    const voteBlocker = new Promise<void>((resolve) => {
      resolveVote = resolve;
    });

    server.use(
      http.post(apiPath('/reviews/:reviewId/vote'), async () => {
        await voteBlocker;
        return HttpResponse.json(
          {
            helpfulCount: baseHelpful + 1,
            myVote: 'up',
          },
          { status: 200 },
        );
      }),
    );

    const { result: mutationResult } = renderHook(() => useVoteHelpfulMutation(targetReviewId), {
      wrapper: Wrapper,
    });

    act(() => {
      mutationResult.current.mutate('up');
    });

    // Wait for onMutate optimistic update in cache before server responds
    await waitFor(() => {
      const list = listResult.current.data;
      const r = list?.data.find((rv) => rv.id === targetReviewId);
      expect(r?.helpfulCount).toBe(baseHelpful + 1);
    });

    const optimisticReview = listResult.current.data!.data.find(
      (review) => review.id === targetReviewId,
    );
    expect(optimisticReview?.helpfulCount).toBe(baseHelpful + 1);
    expect(optimisticReview?.myVote).toBe('up');

    // Unblock the server response
    act(() => {
      resolveVote();
    });

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'review:vote', category: 'reviews' }),
    );
    expect(mockCapturePosthogEvent).toHaveBeenCalledWith(
      'review_vote',
      expect.objectContaining({ reviewId: targetReviewId, direction: 'up' }),
    );
  });

  it('restores helpful vote state when the server errors', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: listResult } = renderHook(
      () => useReviewListQuery(productId, { page: 1, pageSize: 3, sort: 'recent' }),
      { wrapper: Wrapper },
    );
    await waitFor(() => {
      expect(listResult.current.data).toBeDefined();
    });

    const targetReview = listResult.current.data!.data[0];
    const targetReviewId = targetReview.id;
    const baseHelpful = targetReview.helpfulCount;

    server.use(
      http.post(apiPath('/reviews/:reviewId/vote'), async () => {
        await delay(30);
        return HttpResponse.json({ message: 'nope' }, { status: 500 });
      }),
    );

    const { result: mutationResult } = renderHook(() => useVoteHelpfulMutation(targetReviewId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate('up');
    });

    await waitFor(() => {
      expect(mutationResult.current.isError).toBe(true);
    });

    const revertedReview = listResult.current.data!.data.find(
      (review) => review.id === targetReviewId,
    );
    expect(revertedReview?.helpfulCount).toBe(baseHelpful);
    expect(revertedReview?.myVote).toBe(targetReview.myVote ?? null);
    expect(mockCaptureSentryException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ action: 'vote', feature: 'reviews' }),
        extra: expect.objectContaining({ reviewId: targetReviewId, direction: 'up' }),
      }),
    );
  });
});
