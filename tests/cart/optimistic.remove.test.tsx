import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import React, { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useCartQuery, useRemoveCartItemMutation } from '@/lib/api/hooks';
import { queryKeys } from '@/lib/api/queryKeys';
import type { Cart } from '@/lib/api/schemas';
import { handlers } from '@/mocks/handlers';
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

describe('cart optimistic remove mutation', () => {
  it('removes the item immediately before confirming with the server', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: cartResult } = renderHook(() => useCartQuery(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(cartResult.current.data).toBeDefined();
    });

    const cart = cartResult.current.data as Cart;
    const targetItem = cart.items[0]!;

    const originalRemoveHandler = handlers.find(
      (handler) =>
        handler.info?.method === 'DELETE' && handler.info?.path === apiPath('/cart/items/:itemId'),
    );

    expect(originalRemoveHandler).toBeDefined();

    server.use(
      http.delete(apiPath('/cart/items/:itemId'), async (...args) => {
        await delay(100);
        return (originalRemoveHandler as any).resolver(...args);
      }),
    );

    const { result: removeResult } = renderHook(() => useRemoveCartItemMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      removeResult.current.mutate({ itemId: targetItem.id, cartId: cart.id });
    });

    await waitFor(() => {
      const optimisticCart = queryClient.getQueryData<Cart>(queryKeys.cart());
      expect(optimisticCart?.items.some((item) => item.id === targetItem.id)).toBe(false);
    });

    await waitFor(() => {
      expect(removeResult.current.isSuccess).toBe(true);
    });

    const finalCart = queryClient.getQueryData<Cart>(queryKeys.cart());
    expect(finalCart?.items.some((item) => item.id === targetItem.id)).toBe(false);
  });

  it('restores the item when the server reports an error', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: cartResult } = renderHook(() => useCartQuery(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(cartResult.current.data).toBeDefined();
    });

    const cart = cartResult.current.data as Cart;
    const targetItem = cart.items[0]!;

    server.use(
      http.delete(apiPath('/cart/items/:itemId'), async () => {
        await delay(100);
        return HttpResponse.json({ message: 'Unable to delete' }, { status: 500 });
      }),
    );

    const { result: removeResult } = renderHook(() => useRemoveCartItemMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      removeResult.current.mutate({ itemId: targetItem.id, cartId: cart.id });
    });

    await waitFor(() => {
      const optimisticCart = queryClient.getQueryData<Cart>(queryKeys.cart());
      expect(optimisticCart?.items.some((item) => item.id === targetItem.id)).toBe(false);
    });

    await waitFor(() => {
      expect(removeResult.current.isError).toBe(true);
    });

    await waitFor(() => {
      const revertedCart = queryClient.getQueryData<Cart>(queryKeys.cart());
      expect(revertedCart?.items.some((item) => item.id === targetItem.id)).toBe(true);
    });
  });
});
