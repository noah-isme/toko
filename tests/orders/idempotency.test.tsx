import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import ReturnsPage from '@/app/(storefront)/returns/page';
import { useCancelOrderMutation } from '@/entities/orders/api/hooks';
import { ApiClientError, NetworkError, setAccessToken } from '@/lib/api/apiClient';
import { queryKeys } from '@/lib/api/queryKeys';
import { customerOperationsApi } from '@/lib/api/services/customerOperations';
import { ordersApi } from '@/lib/api/services/orders';
import { server } from '@/mocks/server';
import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENT_REPLAY_CODE,
  createIdempotencyKey,
  isOrderIdempotencyEnabled,
  useIdempotencyKey,
} from '@/shared/lib/idempotency';

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const FLAG = 'NEXT_PUBLIC_ORDER_IDEMPOTENCY';

function replayResponse() {
  return HttpResponse.json(
    { error: { code: IDEMPOTENT_REPLAY_CODE, message: 'request already in progress' } },
    { status: 409 },
  );
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('order idempotency flag', () => {
  it('is off unless NEXT_PUBLIC_ORDER_IDEMPOTENCY is "true"', () => {
    vi.stubEnv(FLAG, '');
    expect(isOrderIdempotencyEnabled()).toBe(false);
    vi.stubEnv(FLAG, '1');
    expect(isOrderIdempotencyEnabled()).toBe(false);
    vi.stubEnv(FLAG, 'true');
    expect(isOrderIdempotencyEnabled()).toBe(true);
  });

  it('gives no key when the hook is disabled', () => {
    const { result } = renderHook(() => useIdempotencyKey({ enabled: false }));
    expect(result.current.getKey('a')).toBeUndefined();
  });
});

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

  it('sends no key from the cancel hook while the flag is off (default)', async () => {
    vi.stubEnv(FLAG, '');
    server.use(
      http.post('*/orders/:orderId/cancel', ({ request }) => {
        seen.push(request.headers.get(IDEMPOTENCY_HEADER));
        return HttpResponse.json({ data: { status: 'cancelled' } });
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useCancelOrderMutation('o1'), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(seen).toEqual([null]);
  });

  it('reuses the key when the user retries a cancel after a network failure', async () => {
    vi.stubEnv(FLAG, 'true');
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

  it('refreshes the order and order list when a cancel is a replay', async () => {
    vi.stubEnv(FLAG, 'true');
    server.use(http.post('*/orders/:orderId/cancel', () => replayResponse()));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCancelOrderMutation('o1'), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toMatchObject({
        code: IDEMPOTENT_REPLAY_CODE,
      });
    });

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.order('o1') });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders'] });
    });
  });

  it('does not refresh on an ordinary cancel failure', async () => {
    vi.stubEnv(FLAG, 'true');
    server.use(
      http.post('*/orders/:orderId/cancel', () =>
        HttpResponse.json({ error: { code: 'CONFLICT', message: 'nope' } }, { status: 409 }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCancelOrderMutation('o1'), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBeInstanceOf(ApiClientError);
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('returns page', () => {
  let listCalls = 0;
  const seen: Array<string | null> = [];

  beforeEach(() => {
    listCalls = 0;
    seen.length = 0;
    setAccessToken('test-token');
    server.use(
      http.get('*/returns', () => {
        listCalls += 1;
        return HttpResponse.json({ data: [] });
      }),
    );
  });

  afterEach(() => {
    setAccessToken(null);
  });

  async function submitReturn() {
    renderWithIntl(<ReturnsPage />, { locale: 'en' });
    await waitFor(() => expect(listCalls).toBe(1));
    fireEvent.change(screen.getByLabelText('Order number'), { target: { value: 'ORD-1' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Damaged' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  }

  it('sends no Idempotency-Key while the flag is off (default)', async () => {
    vi.stubEnv(FLAG, '');
    server.use(
      http.post('*/orders/:orderId/returns', ({ request }) => {
        seen.push(request.headers.get(IDEMPOTENCY_HEADER));
        return HttpResponse.json(
          { data: { id: 'r1', orderId: 'ORD-1', status: 'REQUESTED', reason: 'Damaged' } },
          { status: 201 },
        );
      }),
    );

    await submitReturn();

    await waitFor(() => expect(seen).toEqual([null]));
  });

  it('sends the key when enabled and reports a replay as already submitted', async () => {
    vi.stubEnv(FLAG, 'true');
    server.use(
      http.post('*/orders/:orderId/returns', ({ request }) => {
        seen.push(request.headers.get(IDEMPOTENCY_HEADER));
        return replayResponse();
      }),
    );

    await submitReturn();

    expect(
      await screen.findByText(
        'This request was already submitted. Check the list below for its status.',
      ),
    ).toBeInTheDocument();
    expect(seen[0]).toMatch(UUID_V4);
    // The list is reloaded to show what the first attempt created, and the form is cleared.
    await waitFor(() => expect(listCalls).toBe(2));
    expect(screen.getByLabelText('Order number')).toHaveValue('');
    expect(screen.queryByText(/Failed to create the request/)).not.toBeInTheDocument();
  });
});
