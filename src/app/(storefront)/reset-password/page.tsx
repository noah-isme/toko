'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { PasswordStrength } from '@/components/password-strength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthErrorMessage } from '@/entities/auth/hooks';
import type { ResetPasswordInput } from '@/entities/auth/schemas';
import { resetPasswordInputSchema } from '@/entities/auth/schemas';
import { authApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/utils';
import { fieldA11y } from '@/shared/ui/forms/accessibility';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth.reset');
  const tf = useTranslations('auth.fields');
  const errorText = useAuthErrorMessage();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState, setError, watch } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordInputSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const password = watch('password');

  const onSubmit = async (values: ResetPasswordInput) => {
    if (!token) {
      setError('root', { message: t('tokenMissing') });
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword: values.password });
      setIsComplete(true);
      setTimeout(() => router.push('/login'), 1800);
    } catch (error) {
      setError('root', { message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordError = errorText(formState.errors.password?.message);
  const passwordErrorId = passwordError ? 'reset-password-error' : undefined;
  const confirmError = errorText(formState.errors.confirmPassword?.message);
  const confirmErrorId = confirmError ? 'reset-confirm-error' : undefined;

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-amber-100 p-4 text-amber-700">
            <KeyRound className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t('invalidTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('invalidDescription')}</p>
        </div>
        <Button asChild className="w-full">
          <Link href="/forgot-password">{t('requestLink')}</Link>
        </Button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div
        className="mx-auto w-full max-w-md space-y-6 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-emerald-100 p-4 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t('successTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('successDescription')}</p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">{t('backToLogin')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
        {formState.errors.root?.message ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {formState.errors.root.message}
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            {tf('newPassword')}
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
            {tf('confirmNewPassword')}
          </label>
          <Input
            {...register('confirmPassword')}
            {...fieldA11y('confirmPassword', confirmErrorId)}
            type="password"
            autoComplete="new-password"
            required
          />
          {confirmError ? (
            <p className="text-xs text-destructive" id={confirmErrorId} role="alert">
              {confirmError}
            </p>
          ) : null}
        </div>
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('common');
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md space-y-6 text-center">
          <h1 className="text-2xl font-bold">{t('loading')}</h1>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
