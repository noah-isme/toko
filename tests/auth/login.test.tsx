import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/app/(storefront)/login/page';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { authApi, cartApi } from '@/lib/api/services';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
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
  cartApi: {
    getActiveCart: vi.fn(),
  },
}));

beforeEach(() => {
  (globalThis as { React?: typeof React }).React = React;
  pushMock.mockClear();
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(null as never);
  vi.mocked(cartApi.getActiveCart).mockResolvedValue(null as never);
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  it('renders the login form correctly', async () => {
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Forgot password\?/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    expect(await screen.findByText(/Format email tidak valid/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Sign in/i });
    await user.click(submitButton);

    expect(await screen.findByText(/Email wajib diisi/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password wajib diisi/i)).toBeInTheDocument();
  });

  it('submits form successfully and redirects to home', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
    };

    vi.mocked(authApi.login).mockResolvedValue({
      user: mockUser,
      accessToken: 'mock-token',
    } as never);

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();

    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials') as never);

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Invalid credentials/i);
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    let resolveLogin: (value: never) => void;
    const loginPromise = new Promise<never>((resolve) => {
      resolveLogin = resolve;
    });

    vi.mocked(authApi.login).mockReturnValue(loginPromise);

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Signing in\.\.\./i)).toBeInTheDocument();
    });

    resolveLogin!({
      user: { id: '1', email: 'test@example.com', name: 'Test', emailVerified: true },
      accessToken: 'token',
    } as never);
  });
});
