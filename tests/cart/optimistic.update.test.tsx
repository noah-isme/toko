import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http } from 'msw';
import React, { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useCartQuery, useUpdateCartItemMutation } from '@/lib/api/hooks';
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

describe('cart optimistic update mutation', () => {
  it('processes one in-flight update per item and guards subsequent calls', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: cartResult } = renderHook(() => useCartQuery(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(cartResult.current.data).toBeDefined();
    });

    const cart = cartResult.current.data as Cart;
    const targetItem = cart.items[0]!;
    const initialQuantity = targetItem.quantity;

    const originalUpdateHandler = handlers.find(
      (handler) =>
        handler.info?.method === 'PATCH' && handler.info?.path === apiPath('/cart/items/:itemId'),
    );

    expect(originalUpdateHandler).toBeDefined();

    server.use(
      http.patch(apiPath('/cart/items/:itemId'), async (...args) => {
        await delay(120);
        return (originalUpdateHandler as any).resolver(...args);
      }),
    );

    const { result: updateResult } = renderHook(() => useUpdateCartItemMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      updateResult.current.mutate({
        itemId: targetItem.id,
        quantity: initialQuantity + 2,
        maxQuantity: targetItem.maxQuantity,
        cartId: cart.id,
      });
      updateResult.current.mutate({
        itemId: targetItem.id,
        quantity: initialQuantity + 3,
        maxQuantity: targetItem.maxQuantity,
        cartId: cart.id,
      });
    });

    const optimisticCart = queryClient.getQueryData<Cart>(queryKeys.cart());
    const optimisticItem = optimisticCart?.items.find((item) => item.id === targetItem.id);
    expect(optimisticItem?.quantity).toBe(initialQuantity + 2);

    expect(updateResult.current.isItemInFlight(targetItem.id)).toBe(true);

    await waitFor(() => {
      expect(updateResult.current.isSuccess).toBe(true);
    });

    const finalCart = queryClient.getQueryData<Cart>(queryKeys.cart());
    const finalItem = finalCart?.items.find((item) => item.id === targetItem.id);
    expect(finalItem?.quantity).toBe(initialQuantity + 2);
    expect(updateResult.current.isItemInFlight(targetItem.id)).toBe(false);
  });
});
