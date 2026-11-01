/**
 * Account security section against the documented `/auth/sessions` and
 * `/auth/logout/all` contract (served by the shared mock resolver via MSW).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import ProfilePage from '@/app/(storefront)/account/profile/page';
import { NetworkError } from '@/lib/api/apiClient';
import { resetMockState } from '@/mocks/resolvers/session';

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/account/profile',
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, prefetch: vi.fn() }),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => auth.current }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderWithIntl(<ProfilePage />, { locale: 'en', wrapper });
}

let logoutAll: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetMockState();
  nav.replace.mockReset();
  toast.mockReset();
  logoutAll = vi.fn().mockResolvedValue(undefined);
  auth.current = {
    user: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      emailVerified: true,
      createdAt: '2026-01-01',
    },
    isAuthenticated: true,
    isLoading: false,
    updateProfile: vi.fn(),
    logoutAll,
  };
});

afterEach(() => resetMockState());

describe('account sessions', () => {
  it('lists sessions by sign-in time without claiming a current device', async () => {
    renderPage();
    expect(await screen.findByText('Chrome on macOS')).toBeInTheDocument();
    expect(screen.getByText('Safari on iOS')).toBeInTheDocument();
    expect(screen.getAllByText(/^Signed in: /)).toHaveLength(2);
    expect(screen.queryByText('This device')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Sessions that have already expired can still be listed until they are cleaned up.',
      ),
    ).toBeInTheDocument();
  });

  it('confirms, revokes every session and signs this device out', async () => {
    renderPage();
    await screen.findByText('Chrome on macOS');

    fireEvent.click(screen.getByRole('button', { name: 'Log out all devices' }));
    let dialog = await screen.findByRole('dialog', { name: 'Log out of all devices?' });
    expect(dialog).toHaveTextContent('including this device');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(logoutAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Log out all devices' }));
    dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log out everywhere' }));

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/login'));
    expect(logoutAll).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        description: 'All sessions have been signed out.',
      }),
    );
  });

  it('stays on the page and reports a failed logout-all', async () => {
    logoutAll.mockRejectedValue(new NetworkError('Offline'));
    renderPage();
    await screen.findByText('Chrome on macOS');

    fireEvent.click(screen.getByRole('button', { name: 'Log out all devices' }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Log out everywhere' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
