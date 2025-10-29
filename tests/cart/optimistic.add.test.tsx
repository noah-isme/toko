import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import React, { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useAddToCartMutation, useCartQuery, useProductsQuery } from '@/lib/api/hooks';
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

describe('cart optimistic add mutation', () => {
  it('updates the cache optimistically before the server responds', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: cartResult } = renderHook(() => useCartQuery(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(cartResult.current.data).toBeDefined();
    });

    const initialCart = cartResult.current.data as Cart;
    const initialCount = initialCart.itemCount;

    const { result: productsResult } = renderHook(() => useProductsQuery(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(productsResult.current.data).toBeDefined();
    });

    const availableProduct = productsResult.current.data!.find(
      (product) => !initialCart.items.some((item) => item.productId === product.id),
    );

    expect(availableProduct).toBeDefined();

    const originalAddHandler = handlers.find(
      (handler) => handler.info?.method === 'POST' && handler.info?.path === apiPath('/cart/items'),
    );

    expect(originalAddHandler).toBeDefined();

    server.use(
      http.post(apiPath('/cart/items'), async (...args) => {
        await delay(100);
        return (originalAddHandler as any).resolver(...args);
      }),
    );

    const { result: mutationResult } = renderHook(() => useAddToCartMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate({
        productId: availableProduct!.id,
        quantity: 1,
        name: availableProduct!.name,
        price: availableProduct!.price,
        image: availableProduct!.images[0] ?? null,
        maxQuantity: availableProduct!.inventory,
      });
    });

    const optimisticCart = queryClient.getQueryData<Cart>(queryKeys.cart());
    expect(optimisticCart?.itemCount).toBeGreaterThan(initialCount);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    const finalCart = queryClient.getQueryData<Cart>(queryKeys.cart());
    expect(finalCart?.itemCount).toBeGreaterThan(initialCount);
  });

  it('rolls back the cache when the server returns an error', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);

    const { result: cartResult } = renderHook(() => useCartQuery(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(cartResult.current.data).toBeDefined();
    });

    const initialCart = cartResult.current.data as Cart;
    const initialCount = initialCart.itemCount;

    const { result: productsResult } = renderHook(() => useProductsQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(productsResult.current.data).toBeDefined();
    });

    const fallbackProduct = productsResult.current.data!.find(
      (product) =>
        product.inventory > 0 && !initialCart.items.some((item) => item.productId === product.id),
    );

    expect(fallbackProduct).toBeDefined();

    server.use(
      http.post(apiPath('/cart/items'), async () => {
        await delay(100);
        return HttpResponse.json({ message: 'Request failed' }, { status: 500 });
      }),
    );

    const { result: mutationResult } = renderHook(() => useAddToCartMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate({
        productId: fallbackProduct!.id,
        quantity: 1,
        name: fallbackProduct!.name,
        price: fallbackProduct!.price,
        image: fallbackProduct!.images[0] ?? null,
        maxQuantity: fallbackProduct!.inventory,
        cartId: initialCart.id,
      });
    });

    await waitFor(() => {
      const optimisticCart = queryClient.getQueryData<Cart>(queryKeys.cart());
      expect(optimisticCart?.itemCount).toBeGreaterThan(initialCount);
    });

    await waitFor(() => {
      expect(mutationResult.current.isError).toBe(true);
    });

    const revertedCart = queryClient.getQueryData<Cart>(queryKeys.cart());
    expect(revertedCart?.itemCount).toBe(initialCount);
  });
});
