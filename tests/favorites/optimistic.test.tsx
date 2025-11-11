import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import React, { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import {
  useAddFavoriteMutation,
  useFavoritesQuery,
  useRemoveFavoriteMutation,
} from '@/entities/favorites/hooks';
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

describe('favorites optimistic mutations', () => {
  it('adds favorite optimistically before server responds', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const testProductId = 'test-product-123';

    const { result: favoritesResult } = renderHook(() => useFavoritesQuery('guest'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(favoritesResult.current.data).toBeDefined();
    });

    const initialCount = favoritesResult.current.data!.length;

    server.use(
      http.post(apiPath('/favorites'), async ({ request }) => {
        await delay(100);
        const body = await request.json();
        return HttpResponse.json({ message: 'Added to favorites' }, { status: 201 });
      }),
    );

    const { result: mutationResult } = renderHook(() => useAddFavoriteMutation('guest'), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate(testProductId);
    });

    const optimisticFavorites = queryClient.getQueryData<any>(['favorites', 'guest']);
    expect(optimisticFavorites).toBeDefined();
    expect(optimisticFavorites.length).toBe(initialCount + 1);
    expect(optimisticFavorites.some((fav: any) => fav.productId === testProductId)).toBe(true);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    const finalFavorites = favoritesResult.current.data!;
    expect(finalFavorites.some((fav) => fav.productId === testProductId)).toBe(true);
  });

  it('removes favorite optimistically before server responds', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const testProductId = 'test-product-456';

    const { result: addMutationResult } = renderHook(() => useAddFavoriteMutation('guest'), {
      wrapper: Wrapper,
    });

    await act(async () => {
      addMutationResult.current.mutate(testProductId);
    });

    await waitFor(() => {
      expect(addMutationResult.current.isSuccess).toBe(true);
    });

    const { result: favoritesResult } = renderHook(() => useFavoritesQuery('guest'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(favoritesResult.current.data?.some((fav) => fav.productId === testProductId)).toBe(
        true,
      );
    });

    const initialCount = favoritesResult.current.data!.length;

    server.use(
      http.delete(apiPath('/favorites/:productId'), async () => {
        await delay(100);
        return HttpResponse.json({ message: 'Removed from favorites' }, { status: 200 });
      }),
    );

    const { result: removeMutationResult } = renderHook(() => useRemoveFavoriteMutation('guest'), {
      wrapper: Wrapper,
    });

    await act(async () => {
      removeMutationResult.current.mutate(testProductId);
    });

    const optimisticFavorites = queryClient.getQueryData<any>(['favorites', 'guest']);
    expect(optimisticFavorites).toBeDefined();
    expect(optimisticFavorites.length).toBe(initialCount - 1);
    expect(optimisticFavorites.some((fav: any) => fav.productId === testProductId)).toBe(false);

    await waitFor(() => {
      expect(removeMutationResult.current.isSuccess).toBe(true);
    });
  });

  it('handles rapid toggle without race conditions', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const testProductId = 'test-rapid-toggle';

    const { result: addMutation } = renderHook(() => useAddFavoriteMutation('guest'), {
      wrapper: Wrapper,
    });
    const { result: removeMutation } = renderHook(() => useRemoveFavoriteMutation('guest'), {
      wrapper: Wrapper,
    });

    await act(async () => {
      addMutation.current.mutate(testProductId);
    });

    await waitFor(() => {
      expect(addMutation.current.isSuccess).toBe(true);
    });

    await act(async () => {
      removeMutation.current.mutate(testProductId);
    });

    await waitFor(() => {
      expect(removeMutation.current.isSuccess).toBe(true);
    });

    const finalFavorites = queryClient.getQueryData<any>(['favorites', 'guest']);
    expect(finalFavorites?.some((fav: any) => fav.productId === testProductId)).toBe(false);
  });

  it('rolls back optimistic update on error', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const testProductId = 'test-error-rollback';

    const { result: favoritesResult } = renderHook(() => useFavoritesQuery('guest'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(favoritesResult.current.data).toBeDefined();
    });

    const initialFavorites = favoritesResult.current.data!;

    server.use(
      http.post(apiPath('/favorites'), async () => {
        await delay(50);
        return HttpResponse.json({ message: 'Server error' }, { status: 500 });
      }),
    );

    const { result: mutationResult } = renderHook(() => useAddFavoriteMutation('guest'), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate(testProductId);
    });

    await waitFor(() => {
      expect(mutationResult.current.isError).toBe(true);
    });

    const rolledBackFavorites = queryClient.getQueryData<any>(['favorites', 'guest']);
    expect(rolledBackFavorites).toEqual(initialFavorites);
  });
});
