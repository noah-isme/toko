import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import React, { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useCartQuery, useRemoveCartItemMutation } from '@/lib/api/hooks';
import { queryKeys } from '@/lib/api/queryKeys';
import type { CartView } from '@/lib/api/schemas';
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

    const cart = cartResult.current.data as CartView;
    const targetItem = cart.items[0]!;

    const originalRemoveHandler = handlers.find(
      (handler) =>
        handler.info?.method === 'DELETE' &&
        handler.info?.path === apiPath('/carts/:cartId/items/:itemId'),
    );

    expect(originalRemoveHandler).toBeDefined();

    server.use(
      http.delete(apiPath('/carts/:cartId/items/:itemId'), async (...args) => {
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
      const optimisticCart = queryClient.getQueryData<CartView>(queryKeys.cart());
      expect(optimisticCart?.items.some((item) => item.id === targetItem.id)).toBe(false);
    });

    await waitFor(() => {
      expect(removeResult.current.isSuccess).toBe(true);
    });

    const finalCart = queryClient.getQueryData<CartView>(queryKeys.cart());
    expect(finalCart?.items.some((item) => item.id === targetItem.id)).toBe(false);
  });

  it('restores the item when the server reports an error', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: cartResult } = renderHook(() => useCartQuery(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(cartResult.current.data).toBeDefined();
    });

    const cart = cartResult.current.data as CartView;
    const targetItem = cart.items[0]!;

    let resolveRemoveError!: () => void;
    const removeErrorBlocker = new Promise<void>((resolve) => {
      resolveRemoveError = resolve;
    });

    server.use(
      http.delete(apiPath('/carts/:cartId/items/:itemId'), async () => {
        await removeErrorBlocker;
        return HttpResponse.json({ message: 'Unable to delete' }, { status: 500 });
      }),
    );

    const { result: removeResult } = renderHook(() => useRemoveCartItemMutation(), {
      wrapper: Wrapper,
    });

    act(() => {
      removeResult.current.mutate({ itemId: targetItem.id, cartId: cart.id });
    });

    await waitFor(() => {
      const optimisticCart = queryClient.getQueryData<CartView>(queryKeys.cart());
      expect(optimisticCart?.items.some((item) => item.id === targetItem.id)).toBe(false);
    });

    // Unblock server with error
    act(() => {
      resolveRemoveError();
    });

    await waitFor(() => {
      expect(removeResult.current.isError).toBe(true);
    });

    await waitFor(() => {
      const revertedCart = queryClient.getQueryData<CartView>(queryKeys.cart());
      expect(revertedCart?.items.some((item) => item.id === targetItem.id)).toBe(true);
    });
  });
});
