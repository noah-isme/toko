import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterPage from '@/app/(storefront)/register/page';
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

async function waitForForm() {
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /Create an account/i })).toBeInTheDocument();
  });
}

describe('RegisterPage', () => {
  it('renders the registration form correctly', async () => {
    renderWithProviders(<RegisterPage />);
    await waitForForm();

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await waitForForm();

    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText(/Nama wajib diisi/i)).toBeInTheDocument();
    expect(await screen.findByText(/Email wajib diisi/i)).toBeInTheDocument();
  });

  it('validates password strength requirements', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await waitForForm();

    await user.type(screen.getByLabelText(/^Password$/i), 'short');
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText(/Password minimal 8 karakter/i)).toBeInTheDocument();
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await waitForForm();

    await user.type(screen.getByLabelText(/Name/i), 'John Doe');
    await user.type(screen.getByLabelText(/Email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'SecurePass123');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'DifferentPass123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText(/Password tidak cocok/i)).toBeInTheDocument();
  });

  it('requires terms acceptance', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await waitForForm();

    await user.type(screen.getByLabelText(/Name/i), 'John Doe');
    await user.type(screen.getByLabelText(/Email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'SecurePass123');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'SecurePass123');
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(
      await screen.findByText(/Anda harus menyetujui syarat dan ketentuan/i),
    ).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('submits successfully without confirmPassword and acceptTerms in payload', async () => {
    const user = userEvent.setup();

    vi.mocked(authApi.register).mockResolvedValue({
      user: { id: '1', email: 'john@example.com', name: 'John Doe', emailVerified: false },
      accessToken: 'mock-token',
    } as never);

    renderWithProviders(<RegisterPage />);
    await waitForForm();

    await user.type(screen.getByLabelText(/Name/i), 'John Doe');
    await user.type(screen.getByLabelText(/Email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'SecurePass123');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'SecurePass123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
      });
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message on registration failure', async () => {
    const user = userEvent.setup();

    vi.mocked(authApi.register).mockRejectedValue(new Error('Email already exists') as never);

    renderWithProviders(<RegisterPage />);
    await waitForForm();

    await user.type(screen.getByLabelText(/Name/i), 'John Doe');
    await user.type(screen.getByLabelText(/Email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'SecurePass123');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'SecurePass123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Email already exists/i);
  });
});
