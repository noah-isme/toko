import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCreatePaymentIntentMutation } from '@/entities/payment/api/hooks';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('useCreatePaymentIntentMutation with real API base', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts to backend API URL and parses optional fields', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.example.com/api';

    const responsePayload = {
      orderId: 'order-001',
      provider: 'midtrans' as const,
      channel: 'snap',
      token: 'snap-token-987',
      redirectUrl: 'https://snap.example.com/pay/987',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const queryClient = createQueryClient();

    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useCreatePaymentIntentMutation(), { wrapper: Wrapper });

    const payload = {
      orderId: 'order-001',
      provider: 'midtrans' as const,
      channel: 'snap' as const,
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    await waitFor(() => {
      expect(result.current.data).toMatchObject(responsePayload);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.example.com/api/payments/intent',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );

    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers | undefined;

    expect(headers).toBeInstanceOf(Headers);
    expect(headers?.get('Content-Type')).toBe('application/json');
    expect(options?.body).toBe(JSON.stringify(payload));
  });
});
