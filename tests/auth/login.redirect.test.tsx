import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/app/(storefront)/login/page';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { authApi, cartApi } from '@/lib/api/services';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api/services', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
  },
  cartApi: { getActiveCart: vi.fn() },
}));

beforeEach(() => {
  pushMock.mockClear();
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(null as never);
  vi.mocked(cartApi.getActiveCart).mockResolvedValue(null as never);
  vi.mocked(authApi.login).mockResolvedValue({
    user: { id: '1', email: 'test@example.com', name: 'Test User', emailVerified: true },
    accessToken: 'mock-token',
  } as never);
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function renderLogin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

async function signIn() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Selamat datang kembali' })).toBeInTheDocument(),
  );
  await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/^Password$/i), 'password123');
  await user.click(screen.getByTestId('login-submit'));
  await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
  return pushMock.mock.calls[0][0];
}

describe('login redirect', () => {
  it('returns to the page that asked for sign-in', async () => {
    window.history.replaceState(
      null,
      '',
      `/login?redirect=${encodeURIComponent('/products/oak-chair?ref=home')}`,
    );

    expect(await signIn()).toBe('/products/oak-chair?ref=home');
  });

  it.each(['https://evil.example/x', '//evil.example', '/login'])(
    'ignores the unsafe target %s',
    async (target) => {
      window.history.replaceState(null, '', `/login?redirect=${encodeURIComponent(target)}`);

      expect(await signIn()).toBe('/');
    },
  );

  it('keeps the target on the sign-up link', async () => {
    window.history.replaceState(null, '', `/login?redirect=${encodeURIComponent('/favorites')}`);
    renderLogin();

    expect(await screen.findByRole('link', { name: 'Daftar' })).toHaveAttribute(
      'href',
      '/register?redirect=%2Ffavorites',
    );
  });

  it('links to plain /register without a (safe) target', async () => {
    window.history.replaceState(
      null,
      '',
      `/login?redirect=${encodeURIComponent('//evil.example')}`,
    );
    renderLogin();

    expect(await screen.findByRole('link', { name: 'Daftar' })).toHaveAttribute(
      'href',
      '/register',
    );
  });
});
