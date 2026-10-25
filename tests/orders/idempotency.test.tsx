import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useCancelOrderMutation } from '@/entities/orders/api/hooks';
import { ApiClientError, NetworkError, setAccessToken } from '@/lib/api/apiClient';
import { customerOperationsApi } from '@/lib/api/services/customerOperations';
import { ordersApi } from '@/lib/api/services/orders';
import { server } from '@/mocks/server';
import {
  IDEMPOTENCY_HEADER,
  createIdempotencyKey,
  useIdempotencyKey,
} from '@/shared/lib/idempotency';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('idempotency keys', () => {
  it('creates RFC 4122 v4 keys that differ per call', () => {
    const a = createIdempotencyKey();
    const b = createIdempotencyKey();
    expect(a).toMatch(UUID_V4);
    expect(b).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });

  it('keeps one key per action until it settles, and reuses it only after a network failure', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const first = result.current.getKey('a');
    expect(result.current.getKey('a')).toBe(first);

    result.current.settle(new NetworkError());
    expect(result.current.getKey('a')).toBe(first);

    result.current.settle(new ApiClientError('nope', 'CONFLICT', 409));
    const second = result.current.getKey('a');
    expect(second).not.toBe(first);

    result.current.settle();
    expect(result.current.getKey('a')).not.toBe(second);
  });

  it('starts a new key when the action scope changes', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const first = result.current.getKey('{"orderId":"1"}');
    expect(result.current.getKey('{"orderId":"2"}')).not.toBe(first);
  });
});

describe('Idempotency-Key on order cancel and return creation', () => {
  const seen: Array<string | null> = [];

  beforeEach(() => {
    seen.length = 0;
    setAccessToken('test-token');
  });

  afterEach(() => {
    setAccessToken(null);
  });

  it('sends the key on cancel and return creation', async () => {
    server.use(
      http.post('*/orders/:orderId/cancel', ({ request }) => {
        seen.push(request.headers.get(IDEMPOTENCY_HEADER));
        return HttpResponse.json({ data: { status: 'cancelled' } });
      }),
      http.post('*/orders/:orderId/returns', ({ request }) => {
        seen.push(request.headers.get(IDEMPOTENCY_HEADER));
        return HttpResponse.json(
          { data: { id: 'r1', orderId: 'o1', status: 'REQUESTED', reason: 'x' } },
          { status: 201 },
        );
      }),
    );

    await ordersApi.cancelOrder('o1', { idempotencyKey: 'cancel-key' });
    await customerOperationsApi.createReturn('o1', 'Rusak', undefined, {
      idempotencyKey: 'return-key',
    });
    await ordersApi.cancelOrder('o1');

    expect(seen).toEqual(['cancel-key', 'return-key', null]);
  });

  it('is served by the default mocks', async () => {
    await expect(
      ordersApi.cancelOrder('order-mock-001', { idempotencyKey: createIdempotencyKey() }),
    ).resolves.toEqual({ status: 'cancelled' });
  });

  it('reuses the key when the user retries a cancel after a network failure', async () => {
    let fail = true;
    server.use(
      http.post('*/orders/:orderId/cancel', ({ request }) => {
        seen.push(request.headers.get(IDEMPOTENCY_HEADER));
        if (fail) return HttpResponse.error();
        return HttpResponse.json({ data: { status: 'cancelled' } });
      }),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCancelOrderMutation('o1'), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBeInstanceOf(NetworkError);
    });
    fail = false;
    await act(async () => {
      await result.current.mutateAsync();
    });
    // A later, separate cancel action gets a fresh key.
    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => expect(seen).toHaveLength(3));
    expect(seen[0]).toMatch(UUID_V4);
    expect(seen[1]).toBe(seen[0]);
    expect(seen[2]).not.toBe(seen[0]);
  });
});
