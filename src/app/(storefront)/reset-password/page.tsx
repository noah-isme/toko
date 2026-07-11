'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMemo, useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';

import { PasswordStrength } from '@/components/password-strength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/utils';
import { fieldA11y } from '@/shared/ui/forms/accessibility';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState, setError, watch } = useForm<ResetPasswordForm>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const password = watch('password');

  const onSubmit = async (values: ResetPasswordForm) => {
    if (!token) {
      setError('root', { message: 'Token reset password tidak ditemukan.' });
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

  const passwordError = formState.errors.password?.message;
  const passwordErrorId = passwordError ? 'reset-password-error' : undefined;
  const confirmError = formState.errors.confirmPassword?.message;
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
          <h1 className="text-2xl font-bold">Tautan reset tidak valid</h1>
          <p className="text-sm text-muted-foreground">
            Token reset password tidak ditemukan. Minta tautan baru untuk melanjutkan.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Minta tautan reset</Link>
        </Button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 text-center" role="status" aria-live="polite">
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-emerald-100 p-4 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Password berhasil diubah</h1>
          <p className="text-sm text-muted-foreground">
            Silakan login dengan password baru Anda.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">Kembali ke login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="text-sm text-muted-foreground">Buat password baru untuk akun Anda.</p>
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
            Password baru
          </label>
          <Input
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
              pattern: {
                value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                message: 'Gunakan kombinasi huruf dan angka',
              },
            })}
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
            Konfirmasi password
          </label>
          <Input
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === password || 'Passwords do not match',
            })}
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
          {isSubmitting ? 'Memperbarui password...' : 'Simpan password baru'}
        </Button>
      </form>
    </div>
  );
}
