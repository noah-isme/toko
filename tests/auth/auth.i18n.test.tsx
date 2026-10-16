import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_MESSAGES } from '../utils/next-intl-mock';
import { renderWithIntl } from '../utils/renderWithIntl';

import ForgotPasswordPage from '@/app/(storefront)/forgot-password/page';
import LoginPage from '@/app/(storefront)/login/page';
import RegisterPage from '@/app/(storefront)/register/page';
import ResetPasswordPage from '@/app/(storefront)/reset-password/page';
import VerifyEmailPage from '@/app/(storefront)/verify-email/page';
import { CustomerGuard } from '@/components/customer-guard';
import { PasswordStrength } from '@/components/password-strength';
import { AuthProvider } from '@/components/providers/AuthProvider';
import {
  AUTH_VALIDATION_KEYS,
  AUTH_VALIDATION_MESSAGES,
  authValidationKey,
  registerInputSchema,
} from '@/entities/auth/schemas';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

const searchParams = vi.hoisted(() => ({ value: new URLSearchParams() }));

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    usePathname: () => '/account',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => searchParams.value,
  };
});

beforeEach(() => {
  searchParams.value = new URLSearchParams();
  localStorage.clear();
});

function Providers({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('auth validation keys', () => {
  it('keeps every schema message identical to the id catalog text', () => {
    for (const key of AUTH_VALIDATION_KEYS) {
      expect(TEST_MESSAGES.id.auth.validation[key]).toBe(AUTH_VALIDATION_MESSAGES[key]);
      expect(TEST_MESSAGES.en.auth.validation[key]).toBeTruthy();
    }
  });

  it('maps every schema message back to its catalog key', () => {
    const result = registerInputSchema.safeParse({
      name: '',
      email: 'nope',
      password: 'short',
      confirmPassword: 'other',
      acceptTerms: false,
    });
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages.every((message) => authValidationKey(message) !== undefined)).toBe(true);
    expect(authValidationKey('Invalid credentials')).toBeUndefined();
  });
});

describe('auth pages in English', () => {
  it('renders the login page, shell and social buttons in English', async () => {
    renderWithIntl(<LoginPage />, { locale: 'en', wrapper: Providers });

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Back to the store')).toBeInTheDocument();
    expect(screen.getByText('Shopping that feels personal')).toBeInTheDocument();
    expect(screen.getByText('Delivery across Indonesia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
    expect(screen.getByText(/Don't have an account\?/)).toBeInTheDocument();
  });

  it('translates schema errors on the login form', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LoginPage />, { locale: 'en', wrapper: Providers });

    await user.click(await screen.findByTestId('login-submit'));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('renders register terms links and translated errors', async () => {
    const user = userEvent.setup();
    renderWithIntl(<RegisterPage />, { locale: 'en', wrapper: Providers });

    expect(await screen.findByRole('link', { name: 'Terms and Conditions' })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');

    await user.type(screen.getByLabelText(/^Password$/), 'Secure123');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secure123');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('You must accept the terms and conditions')).toBeInTheDocument();
  });

  it('renders the forgot-password confirmation in English', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiPath('/auth/password/forgot'), () => HttpResponse.json({ message: 'ok' })),
    );
    renderWithIntl(<ForgotPasswordPage />, { locale: 'en', wrapper: Providers });

    expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Email sent')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com').tagName).toBe('STRONG');
    expect(screen.getByRole('button', { name: 'Resend email' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in here' })).toHaveAttribute('href', '/login');
  });

  it('renders the invalid reset link state in English', () => {
    renderWithIntl(<ResetPasswordPage />, { locale: 'en', wrapper: Providers });

    expect(screen.getByRole('heading', { name: 'Invalid reset link' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request reset link' })).toBeInTheDocument();
  });

  it('renders the reset form labels in English', () => {
    searchParams.value = new URLSearchParams('token=tok-1');
    renderWithIntl(<ResetPasswordPage />, { locale: 'en', wrapper: Providers });

    expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeInTheDocument();
  });

  it('renders the verify-email fallback in English', async () => {
    renderWithIntl(<VerifyEmailPage />, { locale: 'en', wrapper: Providers });

    expect(await screen.findByRole('heading', { name: 'Verify email' })).toBeInTheDocument();
    expect(
      screen.getByText('The verification link is invalid or has expired.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification' })).toBeInTheDocument();
  });
});

describe('auth widgets', () => {
  it('renders password strength feedback in English', () => {
    renderWithIntl(<PasswordStrength password="abc" />, { locale: 'en' });

    expect(screen.getByText('Password strength: weak')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add at least 8 characters, an uppercase letter, a number, a special character for a stronger password',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('One special character')).toBeInTheDocument();
  });

  it('renders password strength with the id catalog by default', () => {
    renderWithIntl(<PasswordStrength password="Abcdefgh1234!" />);

    expect(screen.getByText('Kekuatan password: kuat')).toBeInTheDocument();
    expect(screen.getByText('Bagus! Password Anda kuat')).toBeInTheDocument();
  });

  it('renders the customer guard prompt in both locales', async () => {
    const { unmount } = renderWithIntl(<CustomerGuard>secret</CustomerGuard>, {
      locale: 'en',
      wrapper: Providers,
    });
    expect(await screen.findByText('Preparing your account')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    unmount();

    renderWithIntl(<CustomerGuard>secret</CustomerGuard>, { wrapper: Providers });
    expect(await screen.findByText('Menyiapkan akun Anda')).toBeInTheDocument();
  });
});
