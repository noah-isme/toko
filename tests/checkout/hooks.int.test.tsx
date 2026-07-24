import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useCheckoutMutation, useShippingQuoteMutation } from '@/entities/checkout/api/hooks';
import type { ShippingOption } from '@/entities/checkout/api/hooks';
import { useCartQuery } from '@/lib/api/hooks';

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
  it('retrieves shipping options and completes checkout', async () => {
    const queryClient = createQueryClient();

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result: cartResult } = renderHook(() => useCartQuery(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(cartResult.current.isSuccess).toBe(true);
    });

    const cartId = cartResult.current.data!.id;
    const validAddress = {
      receiverName: 'Jane Doe',
      phone: '08123456789',
      addressLine1: 'Jl. Senopati No. 12',
      addressLine2: '',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12120',
      country: 'Indonesia',
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

    const { result: checkoutResult } = renderHook(() => useCheckoutMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await checkoutResult.current.mutateAsync({
        cartId,
        shippingAddressId: 'addr-1',
        shippingService: selectedOption.id,
        shippingCost: selectedOption.cost,
        paymentMethod: 'bank_transfer',
      });
    });

    await waitFor(() => {
      expect(checkoutResult.current.isSuccess).toBe(true);
      expect(checkoutResult.current.data?.orderId).toBeTruthy();
    });
  });
});
