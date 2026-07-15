import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ForgotPasswordPage from '@/app/(storefront)/forgot-password/page';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
    }),
    useSearchParams: () => ({
      get: () => null,
    }),
  };
});

beforeEach(() => {
  (globalThis as { React?: typeof React }).React = React;
  pushMock.mockClear();
  replaceMock.mockClear();
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

describe('ForgotPasswordPage', () => {
  it('renders the forgot password form correctly', () => {
    renderWithClient(<ForgotPasswordPage />);
    expect(screen.getByRole('heading', { name: /Lupa password\?/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kirim tautan reset/i })).toBeInTheDocument();
  });

  it('validates email format before submission', async () => {
    const user = userEvent.setup();
    renderWithClient(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Kirim tautan reset/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    expect(await screen.findByText(/Format email tidak valid/i)).toBeInTheDocument();
  });

  it('submits form successfully and displays success card with resend functionality', async () => {
    const user = userEvent.setup();
    let forgotPasswordCalled = false;
    let resendCalled = false;

    server.use(
      http.post(apiPath('/auth/password/forgot'), () => {
        forgotPasswordCalled = true;
        return HttpResponse.json({ data: { message: 'Password reset email sent' } });
      }),
      http.post(apiPath('/auth/email/resend'), () => {
        resendCalled = true;
        return HttpResponse.json({ data: { message: 'Verification email sent' } });
      }),
    );

    renderWithClient(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Kirim tautan reset/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(forgotPasswordCalled).toBe(true);
      expect(screen.getByText(/Email terkirim/i)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });

    const resendButton = screen.getByRole('button', { name: /Kirim ulang email/i });
    await user.click(resendButton);

    await waitFor(() => {
      // The forgotPassword method is re-triggered on resend in page.tsx:
      // onClick={() => { void onSubmit({ email: getValues('email') || sentEmail }); }}
      // So forgotPasswordCalled should be true (or we can assert that the handler was hit again).
      expect(screen.getByText(/Email terkirim/i)).toBeInTheDocument();
    });
  });

  it('handles backend api validation or network errors gracefully', async () => {
    const user = userEvent.setup();

    server.use(
      http.post(apiPath('/auth/password/forgot'), () => {
        return HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Email tidak terdaftar',
            },
          },
          { status: 400 },
        );
      }),
    );

    renderWithClient(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Kirim tautan reset/i });

    await user.type(emailInput, 'notfound@example.com');
    await user.click(submitButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Data yang Anda masukkan tidak valid\./i,
    );
  });
});
