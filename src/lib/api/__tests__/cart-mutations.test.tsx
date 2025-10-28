import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useAddToCartMutation, useCartQuery, useProductsQuery } from '../hooks';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('useAddToCartMutation', () => {
  it('adds an item to the cart and refreshes the cache', async () => {
    const queryClient = createQueryClient();

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result: cartResult } = renderHook(() => useCartQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(cartResult.current.isSuccess).toBe(true);
    });

    const initialCart = cartResult.current.data!;
    const initialCount = initialCart.itemCount;

    const { result: productsResult } = renderHook(() => useProductsQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(productsResult.current.isSuccess).toBe(true);
    });

    const targetProduct = productsResult.current.data?.find(
      (product) => !initialCart.items.some((item) => item.productId === product.id),
    );

    expect(targetProduct).toBeDefined();

    const { result: mutationResult } = renderHook(() => useAddToCartMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await mutationResult.current.mutateAsync({
        productId: targetProduct!.id,
        quantity: 1,
      });
    });

    await waitFor(() => {
      expect(cartResult.current.data?.itemCount).toBeGreaterThan(initialCount);
    });

    expect(
      cartResult.current.data?.items.some((item) => item.productId === targetProduct!.id),
    ).toBe(true);
  });
});
