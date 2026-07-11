import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VerifyEmailPage from '@/app/(storefront)/verify-email/page';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshUserMock = vi.fn();

let mockToken = '';
let mockEmailParam = '';
let mockIsAuthenticated = false;

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
    }),
    useSearchParams: () => ({
      get: (key: string) => {
        if (key === 'token') return mockToken;
        if (key === 'email') return mockEmailParam;
        return null;
      },
    }),
  };
});

vi.mock('@/components/providers/AuthProvider', () => {
  return {
    useAuth: () => ({
      user: mockIsAuthenticated ? { email: 'user@example.com', name: 'User' } : null,
      isAuthenticated: mockIsAuthenticated,
      refreshUser: refreshUserMock,
    }),
  };
});

beforeEach(() => {
  (globalThis as { React?: typeof React }).React = React;
  pushMock.mockClear();
  replaceMock.mockClear();
  refreshUserMock.mockClear();
  mockToken = '';
  mockEmailParam = '';
  mockIsAuthenticated = false;
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

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('VerifyEmailPage', () => {
  it('renders requesting resend form when no token is present', () => {
    mockToken = '';
    renderWithClient(<VerifyEmailPage />);

    expect(screen.getByRole('heading', { name: /Verifikasi email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kirim ulang verifikasi/i })).toBeInTheDocument();
  });

  it('triggers email verification immediately if token is present', async () => {
    mockToken = 'valid-verification-token';
    let verifyCalled = false;

    server.use(
      http.post(apiPath('/auth/email/verify'), async ({ request }) => {
        const body = await request.json() as any;
        expect(body.token).toBe('valid-verification-token');
        verifyCalled = true;
        return HttpResponse.json({ data: { message: 'Email verified successfully' } });
      })
    );

    renderWithClient(<VerifyEmailPage />);

    // Shows verifying state first
    expect(screen.getByRole('heading', { name: /Memverifikasi email\.\.\./i })).toBeInTheDocument();

    await waitFor(() => {
      expect(verifyCalled).toBe(true);
      expect(screen.getByRole('heading', { name: /Email terverifikasi/i })).toBeInTheDocument();
      expect(screen.getByText(/Email verified successfully/i)).toBeInTheDocument();
    });

    const redirectButton = screen.getByRole('link', { name: /Kembali ke login/i });
    expect(redirectButton).toHaveAttribute('href', '/login');
  });

  it('navigates to account page on success if already authenticated', async () => {
    mockToken = 'valid-verification-token';
    mockIsAuthenticated = true;

    server.use(
      http.post(apiPath('/auth/email/verify'), () => {
        return HttpResponse.json({ data: { message: 'Email verified successfully' } });
      })
    );

    renderWithClient(<VerifyEmailPage />);

    await waitFor(() => {
      expect(refreshUserMock).toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: /Email terverifikasi/i })).toBeInTheDocument();
    });

    const redirectButton = screen.getByRole('link', { name: /Pergi ke akun/i });
    expect(redirectButton).toHaveAttribute('href', '/account');
  });

  it('shows error message and resend form if verification fails', async () => {
    mockToken = 'invalid-token';

    server.use(
      http.post(apiPath('/auth/email/verify'), () => {
        return HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Token kedaluwarsa atau tidak valid.',
            },
          },
          { status: 400 }
        );
      })
    );

    renderWithClient(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Data yang Anda masukkan tidak valid\./i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Verifikasi email/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });
  });

  it('allows requesting a verification link to be resent', async () => {
    const user = userEvent.setup();
    mockToken = '';
    let resendCalled = false;

    server.use(
      http.post(apiPath('/auth/email/resend'), async ({ request }) => {
        const body = await request.json() as any;
        expect(body.email).toBe('test@example.com');
        resendCalled = true;
        return HttpResponse.json({ data: { message: 'Verification email sent successfully' } });
      })
    );

    renderWithClient(<VerifyEmailPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Kirim ulang verifikasi/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(resendCalled).toBe(true);
      expect(screen.getByText(/Verification email sent successfully/i)).toBeInTheDocument();
    });
  });
});
