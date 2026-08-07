'use client';

import { Bell, Shield, Zap, Send } from 'lucide-react';
import Link from 'next/link';

import { LazyWrapper, LazyPushPreferencesCard } from '@/components/lazy-components';
import { useAuth } from '@/components/providers/AuthProvider';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/shared/ui/EmptyState';

export default function PushSettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Beranda', href: '/' },
            { label: 'Akun', href: '/account' },
            { label: 'Notifikasi Push' },
          ]}
        />
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="h-8 w-1/3 animate-pulse" />
              <CardDescription className="h-4 w-1/2 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Beranda', href: '/' },
            { label: 'Akun', href: '/account' },
            { label: 'Notifikasi Push' },
          ]}
        />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <EmptyState
            icon={<Bell aria-hidden="true" />}
            title="Masuk untuk mengelola notifikasi"
            description="Anda perlu masuk untuk mengakses pengaturan notifikasi push."
          />
          <div className="mt-4 flex gap-3">
            <a
              href="/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Masuk
            </a>
            <a
              href="/register"
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Daftar
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Akun', href: '/account' },
          { label: 'Notifikasi Push' },
        ]}
      />

      <div className="max-w-3xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Notifikasi Push</h1>
          <p className="text-sm text-muted-foreground">
            Kelola preferensi notifikasi real-time untuk pembaruan pesanan, promo, dan lainnya.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
              Pengaturan Notifikasi
            </CardTitle>
            <CardDescription>
              Terima notifikasi real-time tanpa perlu membuka aplikasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LazyWrapper>
              <LazyPushPreferencesCard />
            </LazyWrapper>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-lg bg-amber-100 p-2 text-amber-700">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-amber-900">Tentang Notifikasi Push</h3>
                <p className="text-sm text-amber-800">
                  Notifikasi push memungkinkan Anda menerima pembaruan instan tentang:
                </p>
                <ul className="space-y-1 text-sm text-amber-800">
                  <li className="flex items-center gap-2">
                    <Zap className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Status pesanan dan pengiriman</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Promo flash sale & penurunan harga favorit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Send className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Ulasan baru & pertanyaan produk Anda</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Hadiah loyalitas & poin tersedia</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Bell className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Pengumuman & berita penting</span>
                  </li>
                </ul>
                <p className="mt-2 text-xs text-amber-700">
                  Anda dapat menonaktifkan notifikasi kapan saja. Data preferensi disimpan di server
                  dan disinkronkan di semua perangkat Anda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm text-primary underline hover:no-underline"
          >
            <span>← Kembali ke Akun</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
