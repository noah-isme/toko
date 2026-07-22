import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationBell } from '@/components/notification-bell';
import { mockNotifications } from '@/mocks/handlers.notifications';

// next/navigation router is not available in jsdom — stub it.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

let authState: { isAuthenticated: boolean; user: { id: string; name: string } | null } = {
  isAuthenticated: true,
  user: { id: 'u1', name: 'Test' },
};
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => authState,
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const pristine = mockNotifications.map((n) => ({ ...n }));
beforeEach(() => {
  authState = { isAuthenticated: true, user: { id: 'u1', name: 'Test' } };
  mockNotifications.splice(0, mockNotifications.length, ...pristine.map((n) => ({ ...n })));
});
afterEach(() => {
  mockNotifications.splice(0, mockNotifications.length, ...pristine.map((n) => ({ ...n })));
});

describe('NotificationBell', () => {
  it('renders nothing when the user is not authenticated', () => {
    authState = { isAuthenticated: false, user: null };
    const { container } = renderWithClient(<NotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an unread badge reflecting the count', async () => {
    renderWithClient(<NotificationBell />);

    // 2 unread in the seed data.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /2 belum dibaca/i })).toBeInTheDocument(),
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('caps the badge at 9+', async () => {
    for (let i = 0; i < 12; i += 1) {
      mockNotifications.push({
        id: `extra-${i}`,
        type: 'order_paid',
        title: `Extra ${i}`,
        body: 'body',
        data: {},
        read: false,
        readAt: null,
        createdAt: '2026-07-22T10:00:00Z',
      });
    }

    renderWithClient(<NotificationBell />);

    await waitFor(() => expect(screen.getByText('9+')).toBeInTheDocument());
  });
});
