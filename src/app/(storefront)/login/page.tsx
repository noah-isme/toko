'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { AuthShell } from '@/components/auth-shell';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/input';
import type { LoginInput } from '@/entities/auth/schemas';
import { loginInputSchema } from '@/entities/auth/schemas';
import { getErrorMessage } from '@/lib/api/utils';
import { fieldA11y } from '@/shared/ui/forms/accessibility';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { AuthFormSkeleton } from '@/shared/ui/skeletons/AuthFormSkeleton';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const { register, handleSubmit, formState, setError } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (values: LoginInput) => {
    try {
      await login(values);
      router.push('/');
    } catch (error) {
      const message = getErrorMessage(error);
      setError('root', { message });
    }
  };

  const emailError = formState.errors.email?.message;
  const emailErrorId = emailError ? 'email-error' : undefined;
  const passwordError = formState.errors.password?.message;
  const passwordErrorId = passwordError ? 'password-error' : undefined;
  const showLoadingState = authLoading && !formState.isSubmitting;

  if (showLoadingState) {
    return <AuthFormSkeleton />;
  }

  return (
    <AuthShell
      eyebrow="Kembali ke toko"
      title="Welcome back"
      description="Sign in to continue to your account and curated collection."
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
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            {...register('password')}
            {...fieldA11y('password', passwordErrorId)}
            type="password"
            autoComplete="current-password"
            required
          />
          {passwordError ? (
            <p className="text-xs text-destructive" id={passwordErrorId} role="alert">
              {passwordError}
            </p>
          ) : null}
        </div>
        <GuardedButton
          className="w-full shadow-[0_12px_24px_-16px_rgba(43,32,22,0.9)]"
          type="submit"
          isLoading={formState.isSubmitting || authLoading}
          loadingLabel="Signing in..."
        >
          Sign in
        </GuardedButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          className="font-semibold text-primary underline-offset-4 hover:underline"
          href="/register"
        >
          Register
        </Link>
      </p>
    </AuthShell>
  );
}
