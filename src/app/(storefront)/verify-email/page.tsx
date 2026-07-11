'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, MailCheck, MailWarning } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/utils';
import { fieldA11y } from '@/shared/ui/forms/accessibility';

interface ResendForm {
  email: string;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const emailParam = useMemo(() => searchParams.get('email') ?? '', [searchParams]);
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState, setError, reset } = useForm<ResendForm>({
    defaultValues: {
      email: emailParam || user?.email || '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    reset({ email: emailParam || user?.email || '' });
  }, [emailParam, reset, user?.email]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    setStatus('verifying');
    authApi
      .verifyEmail({ token })
      .then((response) => {
        if (!active) return;
        setStatus('success');
        setStatusMessage(response.message ?? 'Email berhasil diverifikasi.');
        if (isAuthenticated) {
          void refreshUser();
        }
      })
      .catch((error) => {
        if (!active) return;
        setStatus('error');
        setStatusMessage(getErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, token, refreshUser]);

  const onResend = async (values: ResendForm) => {
    setIsResending(true);
    try {
      const response = await authApi.resendVerification(values);
      setResendMessage(response.message ?? 'Email verifikasi berhasil dikirim.');
    } catch (error) {
      setError('root', { message: getErrorMessage(error) });
    } finally {
      setIsResending(false);
    }
  };

  const emailError = formState.errors.email?.message;
  const emailErrorId = emailError ? 'verify-email-error' : undefined;

  if (status === 'verifying') {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 text-center" role="status" aria-live="polite">
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-muted p-4 text-muted-foreground">
            <MailCheck className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Memverifikasi email...</h1>
          <p className="text-sm text-muted-foreground">Harap tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 text-center" role="status" aria-live="polite">
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-emerald-100 p-4 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Email terverifikasi</h1>
          <p className="text-sm text-muted-foreground">
            {statusMessage ?? 'Terima kasih, email Anda sudah aktif.'}
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href={isAuthenticated ? '/account' : '/login'}>
            {isAuthenticated ? 'Pergi ke akun' : 'Kembali ke login'}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Verifikasi email</h1>
        <p className="text-sm text-muted-foreground">
          Masukkan email untuk mengirim ulang tautan verifikasi.
        </p>
      </div>
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <MailWarning className="mt-0.5 h-5 w-5 text-amber-600" aria-hidden="true" />
            <p>{statusMessage ?? 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.'}</p>
          </div>
        </div>
        {resendMessage ? (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            role="status"
            aria-live="polite"
          >
            {resendMessage}
          </div>
        ) : null}
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onResend)} aria-busy={isResending}>
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
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address',
              },
            })}
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
        <Button className="w-full" disabled={isResending} type="submit">
          {isResending ? 'Mengirim ulang...' : 'Kirim ulang verifikasi'}
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Kembali ke login</Link>
        </Button>
      </form>
    </div>
  );
}
