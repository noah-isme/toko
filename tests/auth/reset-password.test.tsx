import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ResetPasswordPage from '@/app/(storefront)/reset-password/page';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

const pushMock = vi.fn();
const replaceMock = vi.fn();

let mockToken = '';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
    }),
    useSearchParams: () => ({
      get: (key: string) => (key === 'token' ? mockToken : null),
    }),
  };
});

beforeEach(() => {
  (globalThis as { React?: typeof React }).React = React;
  pushMock.mockClear();
  replaceMock.mockClear();
  mockToken = '';
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

describe('ResetPasswordPage', () => {
  it('renders invalid token message if token is missing', () => {
    mockToken = '';
    renderWithClient(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: /Tautan reset tidak valid/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Minta tautan reset/i })).toBeInTheDocument();
  });

  it('renders password reset form if token is present', () => {
    mockToken = 'valid-token';
    renderWithClient(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: /Reset password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Password baru/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Konfirmasi password/i)).toBeInTheDocument();
  });

  it('validates password requirements and mismatch', async () => {
    const user = userEvent.setup();
    mockToken = 'valid-token';
    renderWithClient(<ResetPasswordPage />);

    const newPasswordInput = screen.getByLabelText(/Password baru/i);
    const confirmPasswordInput = screen.getByLabelText(/Konfirmasi password/i);
    const submitButton = screen.getByRole('button', { name: /Simpan password baru/i });

    // Too short
    await user.type(newPasswordInput, 'short');
    await user.click(submitButton);
    expect(await screen.findByText(/Password must be at least 8 characters/i)).toBeInTheDocument();

    // Reset and do mismatch
    await user.clear(newPasswordInput);
    await user.type(newPasswordInput, 'ValidPassword123!');
    await user.type(confirmPasswordInput, 'DifferentPassword123!');
    await user.click(submitButton);
    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it('submits form successfully, displays success screen and redirects to login', async () => {
    const user = userEvent.setup();
    mockToken = 'valid-token';
    let resetPasswordCalled = false;

    server.use(
      http.post(apiPath('/auth/password/reset'), async ({ request }) => {
        const body = await request.json() as any;
        expect(body.token).toBe('valid-token');
        expect(body.newPassword).toBe('ValidPassword123!');
        resetPasswordCalled = true;
        return HttpResponse.json({ data: { message: 'Password reset successfully' } });
      })
    );

    renderWithClient(<ResetPasswordPage />);

    const newPasswordInput = screen.getByLabelText(/Password baru/i);
    const confirmPasswordInput = screen.getByLabelText(/Konfirmasi password/i);
    const submitButton = screen.getByRole('button', { name: /Simpan password baru/i });

    await user.type(newPasswordInput, 'ValidPassword123!');
    await user.type(confirmPasswordInput, 'ValidPassword123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(resetPasswordCalled).toBe(true);
      expect(screen.getByRole('heading', { name: /Password berhasil diubah/i })).toBeInTheDocument();
    });

    // Wait for the 1800ms redirect timeout
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    }, { timeout: 3000 });
  });

  it('handles backend api validation errors gracefully', async () => {
    const user = userEvent.setup();
    mockToken = 'invalid-or-expired-token';

    server.use(
      http.post(apiPath('/auth/password/reset'), () => {
        return HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Tautan reset sudah kedaluwarsa atau tidak valid.',
            },
          },
          { status: 400 }
        );
      })
    );

    renderWithClient(<ResetPasswordPage />);

    const newPasswordInput = screen.getByLabelText(/Password baru/i);
    const confirmPasswordInput = screen.getByLabelText(/Konfirmasi password/i);
    const submitButton = screen.getByRole('button', { name: /Simpan password baru/i });

    await user.type(newPasswordInput, 'ValidPassword123!');
    await user.type(confirmPasswordInput, 'ValidPassword123!');
    await user.click(submitButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Data yang Anda masukkan tidak valid\./i);
  });
});
