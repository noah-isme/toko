import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterPage from '@/app/(storefront)/register/page';
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
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(null as never);
  vi.mocked(cartApi.getActiveCart).mockResolvedValue(null as never);
  vi.mocked(authApi.register).mockResolvedValue({
    user: { id: '1', email: 'john@example.com', name: 'John Doe', emailVerified: false },
    accessToken: 'mock-token',
  } as never);
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function renderRegister() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

async function signUp() {
  renderRegister();
  const user = userEvent.setup();
  await screen.findByLabelText(/^Nama$/i);
  await user.type(screen.getByLabelText(/^Nama$/i), 'John Doe');
  await user.type(screen.getByLabelText(/Email/i), 'john@example.com');
  await user.type(screen.getByLabelText(/^Password$/i), 'SecurePass123');
  await user.type(screen.getByLabelText(/Konfirmasi Password/i), 'SecurePass123');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Daftar' }));
  await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
  return pushMock.mock.calls[0][0];
}

describe('register redirect', () => {
  it('returns to the page that asked for sign-in after signing up', async () => {
    window.history.replaceState(
      null,
      '',
      `/register?redirect=${encodeURIComponent('/products/oak-chair')}`,
    );

    expect(await signUp()).toBe('/products/oak-chair');
  });

  it.each(['https://evil.example/x', '//evil.example', '/register'])(
    'ignores the unsafe target %s',
    async (target) => {
      window.history.replaceState(null, '', `/register?redirect=${encodeURIComponent(target)}`);

      expect(await signUp()).toBe('/');
    },
  );

  it('keeps the target on the sign-in link', async () => {
    window.history.replaceState(null, '', `/register?redirect=${encodeURIComponent('/favorites')}`);
    renderRegister();

    expect(await screen.findByRole('link', { name: 'Masuk' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Ffavorites',
    );
  });
});
