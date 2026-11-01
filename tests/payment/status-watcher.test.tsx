import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import React, { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaymentStatusWatcher } from '@/app/(storefront)/checkout/review/_components/PaymentStatusWatcher';
import { usePaymentStatusQuery } from '@/entities/payment/api/hooks';
import { PAYMENT_POLL_SCHEDULE } from '@/entities/payment/polling';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function serveStatus(status: string, onRequest?: () => void) {
  server.use(
    http.get(apiPath('/payments/:orderId/status'), () => {
      onRequest?.();
      return HttpResponse.json({ data: { status } });
    }),
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('usePaymentStatusQuery polling', () => {
  it('stops polling once the status is terminal', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onRequest = vi.fn();
    serveStatus('FAILED', onRequest);

    const { result } = renderHook(() => usePaymentStatusQuery('order-terminal'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data?.status).toBe('FAILED'));
    const calls = onRequest.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(onRequest).toHaveBeenCalledTimes(calls);
    expect(result.current.timedOut).toBe(false);
  });

  it('times out after the max duration and restarts on demand', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onRequest = vi.fn();
    serveStatus('PENDING', onRequest);

    const { result } = renderHook(() => usePaymentStatusQuery('order-pending'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data?.status).toBe('PENDING'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PAYMENT_POLL_SCHEDULE.maxDurationMs + 1_000);
    });

    expect(result.current.timedOut).toBe(true);
    const callsAtTimeout = onRequest.mock.calls.length;
    // 15 fetches in the first minute, 24 in the next four, 20 in the last ten, plus the first.
    expect(callsAtTimeout).toBeLessThan(70);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    expect(onRequest).toHaveBeenCalledTimes(callsAtTimeout);

    await act(async () => {
      await result.current.restart();
    });

    expect(result.current.timedOut).toBe(false);
    expect(onRequest.mock.calls.length).toBeGreaterThan(callsAtTimeout);
  });
});

describe('PaymentStatusWatcher', () => {
  it('shows a still-waiting message with a manual check after timing out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onRequest = vi.fn();
    serveStatus('PENDING', onRequest);
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <PaymentStatusWatcher
          orderId="order-watch"
          active
          manualCheckToken={0}
          onPaid={vi.fn()}
          onFailed={vi.fn()}
          onError={vi.fn()}
        />
      </Wrapper>,
    );

    await waitFor(() => expect(screen.getByText(/Status saat ini:/i)).toHaveTextContent('PENDING'));
    expect(screen.queryByRole('button', { name: 'Periksa lagi' })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PAYMENT_POLL_SCHEDULE.maxDurationMs + 1_000);
    });

    expect(screen.getByText('Masih menunggu konfirmasi pembayaran')).toBeInTheDocument();
    const before = onRequest.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Periksa lagi' }));

    await waitFor(() => expect(onRequest.mock.calls.length).toBeGreaterThan(before));
    await waitFor(() =>
      expect(screen.queryByText('Masih menunggu konfirmasi pembayaran')).not.toBeInTheDocument(),
    );
  });

  it('renders nothing while inactive', () => {
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <PaymentStatusWatcher
          orderId="order-idle"
          active={false}
          manualCheckToken={0}
          onPaid={vi.fn()}
          onFailed={vi.fn()}
          onError={vi.fn()}
        />
      </Wrapper>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
