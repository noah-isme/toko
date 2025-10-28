import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import {
  useCreateOrderDraftMutation,
  useShippingQuoteMutation,
} from '@/entities/checkout/api/hooks';
import type { ShippingOption } from '@/entities/checkout/api/hooks';
import { useCartQuery } from '@/lib/api/hooks';
import { queryKeys } from '@/lib/api/queryKeys';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('checkout mutations', () => {
  it('retrieves shipping options and creates an order draft', async () => {
    const queryClient = createQueryClient();

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result: cartResult } = renderHook(() => useCartQuery(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(cartResult.current.isSuccess).toBe(true);
    });

    const cartId = cartResult.current.data!.id;
    const initialState = queryClient.getQueryState(queryKeys.cart());
    const initialUpdatedAt = initialState?.dataUpdatedAt ?? 0;

    const validAddress = {
      fullName: 'Jane Doe',
      phone: '08123456789',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      postalCode: '12120',
      detail: 'Jl. Senopati No. 12',
    };

    const { result: quoteResult } = renderHook(() => useShippingQuoteMutation(), {
      wrapper: Wrapper,
    });

    let shippingOptions: ShippingOption[] = [];

    await act(async () => {
      shippingOptions = await quoteResult.current.mutateAsync({
        cartId,
        address: validAddress,
      });
    });

    expect(Array.isArray(shippingOptions)).toBe(true);
    expect(shippingOptions).toHaveLength(3);

    const selectedOption = shippingOptions[0]!;

    const { result: draftResult } = renderHook(() => useCreateOrderDraftMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await draftResult.current.mutateAsync({
        cartId,
        address: validAddress,
        shippingOptionId: selectedOption.id,
      });
    });

    await waitFor(() => {
      expect(draftResult.current.isSuccess).toBe(true);
      expect(draftResult.current.data?.totals.total).toBeGreaterThan(0);
    });

    await waitFor(() => {
      const state = queryClient.getQueryState(queryKeys.cart());
      expect(state?.dataUpdatedAt ?? 0).toBeGreaterThan(initialUpdatedAt);
    });
  });
});
