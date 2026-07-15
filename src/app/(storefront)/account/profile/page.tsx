'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MailWarning } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/services';
import { formatDateTime, getErrorMessage, isValidPhoneNumber } from '@/lib/api/utils';
import { fieldA11y } from '@/shared/ui/forms/accessibility';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';
import { useToast } from '@/shared/ui/toast';

interface ProfileForm {
  name: string;
  phone?: string;
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<ProfileForm>({
    defaultValues: {
      name: '',
      phone: '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? '',
        phone: user.phone ?? '',
      });
    }
  }, [form, user]);

  const onSubmit = async (values: ProfileForm) => {
    setIsSubmitting(true);
    setResendSuccess(null);
    setResendError(null);
    try {
      await updateProfile({
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
      });
      toast({ variant: 'success', description: 'Profil berhasil diperbarui.' });
    } catch (error) {
      const message = getErrorMessage(error);
      form.setError('root', { message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) {
      return;
    }
    setIsSubmitting(true);
    setResendSuccess(null);
    setResendError(null);
    try {
      const response = await authApi.resendVerification({ email: user.email });
      setResendSuccess(response.message ?? 'Email verifikasi sudah dikirim.');
    } catch (error) {
      setResendError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sessionsQuery = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authApi.getSessions(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const sortedSessions = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];
    return [...sessions].sort((a, b) => {
      if (a.current) return -1;
      if (b.current) return 1;
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
    });
  }, [sessionsQuery.data]);

  const handleLogoutAllSessions = async () => {
    setIsLoggingOutAll(true);
    setSecurityMessage(null);
    setSecurityError(null);
    try {
      const response = await authApi.logoutAllSessions();
      setSecurityMessage(response.message ?? 'Semua sesi telah keluar.');
      await queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    } catch (error) {
      setSecurityError(getErrorMessage(error));
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <BaseSkeleton className="h-7 w-40" />
          <BaseSkeleton className="mt-2 h-4 w-56" />
        </div>
        <div className="space-y-4 rounded-lg border p-6">
          <BaseSkeleton className="h-10 w-full" />
          <BaseSkeleton className="h-10 w-full" />
          <BaseSkeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profil</h1>
          <p className="text-sm text-muted-foreground">Silakan login untuk melihat profil.</p>
        </div>
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
      </div>
    );
  }

  const nameError = form.formState.errors.name?.message;
  const nameErrorId = nameError ? 'profile-name-error' : undefined;
  const phoneError = form.formState.errors.phone?.message;
  const phoneErrorId = phoneError ? 'profile-phone-error' : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Profil</h1>
          <p className="text-sm text-muted-foreground">Kelola informasi akun Anda.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/account">Kembali ke akun</Link>
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          {user.emailVerified ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          ) : (
            <MailWarning className="h-5 w-5 text-amber-600" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <p className="font-medium">
              {user.emailVerified ? 'Email terverifikasi' : 'Email belum terverifikasi'}
            </p>
            <p>
              {user.emailVerified
                ? 'Terima kasih, email Anda sudah aktif.'
                : 'Verifikasi email untuk memastikan akun Anda aman.'}
            </p>
          </div>
        </div>
        {!user.emailVerified ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={handleResendVerification} disabled={isSubmitting}>
              Kirim ulang verifikasi
            </Button>
            <Link href="/verify-email" className="text-sm font-medium underline">
              Buka halaman verifikasi
            </Link>
          </div>
        ) : null}
        {resendSuccess ? (
          <p className="text-sm text-emerald-700" role="status" aria-live="polite">
            {resendSuccess}
          </p>
        ) : null}
        {resendError ? (
          <p className="text-sm text-destructive" role="alert">
            {resendError}
          </p>
        ) : null}
      </div>

      <form
        className="space-y-4 rounded-lg border p-6"
        onSubmit={form.handleSubmit(onSubmit)}
        aria-busy={isSubmitting ? 'true' : undefined}
      >
        {form.formState.errors.root?.message ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {form.formState.errors.root.message}
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Nama lengkap
          </label>
          <Input
            {...form.register('name', { required: 'Nama wajib diisi' })}
            {...fieldA11y('name', nameErrorId)}
            autoComplete="name"
            required
            disabled={isSubmitting}
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
          <Input value={user.email} disabled readOnly />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="phone">
            Nomor telepon
          </label>
          <Input
            {...form.register('phone', {
              validate: (value) =>
                !value || isValidPhoneNumber(value) || 'Nomor telepon tidak valid',
            })}
            {...fieldA11y('phone', phoneErrorId)}
            autoComplete="tel"
            placeholder="Contoh: 081234567890"
            disabled={isSubmitting}
          />
          {phoneError ? (
            <p className="text-xs text-destructive" id={phoneErrorId} role="alert">
              {phoneError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/forgot-password">Ubah password</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan perubahan'}
          </Button>
        </div>
      </form>

      <section className="space-y-4 rounded-lg border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Keamanan Akun</h2>
            <p className="text-sm text-muted-foreground">
              Kelola sesi aktif dan keluarkan perangkat lain.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogoutAllSessions}
            disabled={isLoggingOutAll}
          >
            {isLoggingOutAll ? 'Memproses...' : 'Logout semua perangkat'}
          </Button>
        </div>

        {securityMessage ? (
          <div
            className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            role="status"
            aria-live="polite"
          >
            {securityMessage}
          </div>
        ) : null}
        {securityError ? (
          <div
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {securityError}
          </div>
        ) : null}

        {sessionsQuery.isLoading ? (
          <div className="space-y-3">
            <BaseSkeleton className="h-4 w-1/3" />
            <BaseSkeleton className="h-10 w-full" />
            <BaseSkeleton className="h-10 w-full" />
          </div>
        ) : sessionsQuery.error ? (
          <div
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            Gagal memuat sesi aktif.
          </div>
        ) : sortedSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada sesi aktif.</p>
        ) : (
          <ul className="space-y-3">
            {sortedSessions.map((session) => (
              <li key={session.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {session.device}
                      {session.current ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Perangkat ini
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      IP: {session.ipAddress}
                      {session.location ? ` • ${session.location}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Terakhir aktif: {formatDateTime(session.lastActive)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
