'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthErrorMessage } from '@/entities/auth/hooks';
import type { ForgotPasswordInput } from '@/entities/auth/schemas';
import { forgotPasswordInputSchema } from '@/entities/auth/schemas';
import { authApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/utils';
import { fieldA11y } from '@/shared/ui/forms/accessibility';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot');
  const tf = useTranslations('auth.fields');
  const errorText = useAuthErrorMessage();
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState, setError, getValues } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordInputSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(values);
      setSentEmail(values.email);
      setResendError(null);
    } catch (error) {
      setError('root', { message: getErrorMessage(error) });
      setResendError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailError = errorText(formState.errors.email?.message);
  const emailErrorId = emailError ? 'forgot-email-error' : undefined;

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      {sentEmail ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <div className="flex items-start gap-3">
            <MailCheck className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">{t('sentTitle')}</p>
              <p>
                {t.rich('sentDescription', {
                  email: sentEmail,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">{t('backToLogin')}</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                void onSubmit({ email: getValues('email') || sentEmail });
              }}
              disabled={isSubmitting}
            >
              {t('resend')}
            </Button>
          </div>
          {resendError ? (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {resendError}
            </p>
          ) : null}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          aria-busy={isSubmitting ? 'true' : undefined}
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
              {tf('email')}
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
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
        </form>
      )}
      <p className="text-center text-sm text-muted-foreground">
        {t.rich('remember', {
          login: (chunks) => (
            <Link className="text-primary" href="/login">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
