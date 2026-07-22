import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/lib/api';
import { mockNotifications } from '@/mocks/handlers.notifications';

type WrapperProps = { children: React.ReactNode };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: WrapperProps) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Reset the shared in-memory mock store between tests so mark-read mutations
// in one test don't leak into another.
const pristine = mockNotifications.map((n) => ({ ...n }));
beforeEach(() => {
  mockNotifications.splice(0, mockNotifications.length, ...pristine.map((n) => ({ ...n })));
});
afterEach(() => {
  mockNotifications.splice(0, mockNotifications.length, ...pristine.map((n) => ({ ...n })));
});

describe('notification hooks', () => {
  it('lists notifications most-recent-first with pagination', async () => {
    const { result } = renderHook(() => useNotifications(1, 20), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(3);
    expect(result.current.data?.pagination.totalItems).toBe(3);
    expect(result.current.data?.data[0].title).toBe('Pesanan tiba');
  });

  it('reports the unread count', async () => {
    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(2);
  });

  it('marks a single notification read', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => ({
        mark: useMarkNotificationRead(),
        count: useUnreadNotificationCount(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.count.isSuccess).toBe(true));
    expect(result.current.count.data).toBe(2);

    result.current.mark.mutate('11111111-1111-1111-1111-111111111111');

    await waitFor(() => expect(result.current.count.data).toBe(1));
  });

  it('marks all notifications read', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => ({
        markAll: useMarkAllNotificationsRead(),
        count: useUnreadNotificationCount(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.count.isSuccess).toBe(true));

    result.current.markAll.mutate();

    await waitFor(() => expect(result.current.count.data).toBe(0));
  });
});
