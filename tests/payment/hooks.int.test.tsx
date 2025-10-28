import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import {
  useCreatePaymentIntentMutation,
  usePaymentStatusQuery,
} from '@/entities/payment/api/hooks';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('payment hooks', () => {
  it('creates a payment intent and resolves to paid status', async () => {
    const orderId = 'order-test-123';
    const queryClient = createQueryClient();

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result: intentResult } = renderHook(() => useCreatePaymentIntentMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await intentResult.current.mutateAsync({
        orderId,
        provider: 'midtrans',
        channel: 'snap',
      });
    });

    await waitFor(() => {
      expect(intentResult.current.data).toBeDefined();
      expect(intentResult.current.data).toMatchObject({
        orderId,
        provider: 'midtrans',
        channel: 'snap',
      });
    });

    const { result: statusResult } = renderHook(
      () => usePaymentStatusQuery(orderId, { enabled: true }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(statusResult.current.data?.status).toBe('PENDING');
    });

    await act(async () => {
      await statusResult.current.refetch();
    });

    await waitFor(() => {
      expect(statusResult.current.data?.status).toBe('PAID');
    });
  });
});
