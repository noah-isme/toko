'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { AuthShell } from '@/components/auth-shell';
import { PasswordStrength } from '@/components/password-strength';
import { useAuth } from '@/components/providers/AuthProvider';
import { SocialLoginButton, SocialLoginDivider, SocialLoginGroup } from '@/components/social-login';
import { Input } from '@/components/ui/input';
import type { RegisterInput } from '@/entities/auth/schemas';
import { registerInputSchema } from '@/entities/auth/schemas';
import { getErrorMessage } from '@/lib/api/utils';
import { fieldA11y } from '@/shared/ui/forms/accessibility';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { AuthFormSkeleton } from '@/shared/ui/skeletons/AuthFormSkeleton';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading: authLoading } = useAuth();
  const { register, handleSubmit, formState, setError, watch } = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true,
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const password = watch('password');

  const onSubmit = async (values: RegisterInput) => {
    try {
      const {
        confirmPassword: _confirmPassword,
        acceptTerms: _acceptTerms,
        ...registerData
      } = values;
      await registerUser(registerData);
      router.push('/');
    } catch (error) {
      const message = getErrorMessage(error);
      setError('root', { message });
    }
  };

  const nameError = formState.errors.name?.message;
  const nameErrorId = nameError ? 'name-error' : undefined;
  const emailError = formState.errors.email?.message;
  const emailErrorId = emailError ? 'email-error' : undefined;
  const passwordError = formState.errors.password?.message;
  const passwordErrorId = passwordError ? 'password-error' : undefined;
  const confirmPasswordError = formState.errors.confirmPassword?.message;
  const confirmPasswordErrorId = confirmPasswordError ? 'confirm-password-error' : undefined;
  const acceptTermsError = formState.errors.acceptTerms?.message;
  const showLoadingState = authLoading && !formState.isSubmitting;

  if (showLoadingState) {
    return <AuthFormSkeleton />;
  }

  return (
    <AuthShell
      eyebrow="Mulai koleksi Anda"
      title="Create an account"
      description="Start shopping with toko today, with a more personal experience."
    >
      <form
        className="space-y-5"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-busy={formState.isSubmitting || authLoading ? 'true' : undefined}
      >
        {formState.errors.root?.message ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {formState.errors.root.message}
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Name
          </label>
          <Input
            {...register('name')}
            {...fieldA11y('name', nameErrorId)}
            autoComplete="name"
            required
          />
          {nameError ? (
            <p className="text-xs text-destructive" id={nameErrorId} role="alert">
              {nameError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input
            {...register('email')}
            {...fieldA11y('email', emailErrorId)}
            type="email"
            autoComplete="email"
            required
          />
          {emailError ? (
            <p className="text-xs text-destructive" id={emailErrorId} role="alert">
              {emailError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <Input
            {...register('password')}
            {...fieldA11y('password', passwordErrorId)}
            type="password"
            autoComplete="new-password"
            required
          />
          {passwordError ? (
            <p className="text-xs text-destructive" id={passwordErrorId} role="alert">
              {passwordError}
            </p>
          ) : null}
          <PasswordStrength password={password} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <Input
            {...register('confirmPassword')}
            {...fieldA11y('confirmPassword', confirmPasswordErrorId)}
            type="password"
            autoComplete="new-password"
            required
          />
          {confirmPasswordError ? (
            <p className="text-xs text-destructive" id={confirmPasswordErrorId} role="alert">
              {confirmPasswordError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              {...register('acceptTerms')}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
            <span className="text-muted-foreground">
              I agree to the{' '}
              <a
                href="/terms"
                className="font-medium text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a
                href="/privacy"
                className="font-medium text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </span>
          </label>
          {acceptTermsError ? (
            <p className="text-xs text-destructive" role="alert">
              {acceptTermsError}
            </p>
          ) : null}
        </div>
        <GuardedButton
          className="w-full"
          type="submit"
          isLoading={formState.isSubmitting || authLoading}
          loadingLabel="Creating account..."
        >
          Register
        </GuardedButton>
      </form>
      <SocialLoginDivider label="or continue with" />
      <SocialLoginGroup>
        <SocialLoginButton provider="google" onClick={() => window.location.href = '/api/auth/google'}>
          Continue with Google
        </SocialLoginButton>
        <SocialLoginButton provider="github" onClick={() => window.location.href = '/api/auth/github'}>
          Continue with GitHub
        </SocialLoginButton>
        <SocialLoginButton provider="apple" onClick={() => window.location.href = '/api/auth/apple'}>
          Continue with Apple
        </SocialLoginButton>
      </SocialLoginGroup>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          className="font-semibold text-primary underline-offset-4 hover:underline"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
