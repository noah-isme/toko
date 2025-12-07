/** @jsxImportSource react */
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { OrderSummary } from '../_components/OrderSummary';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import type { OrderDraft } from '@/entities/checkout/api/hooks';
import { loadOrderDraft } from '@/entities/checkout/utils/draftStorage';
import { PAYMENT_METHOD_LABELS } from '@/lib/api/constants';
import { cn } from '@/lib/utils';

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={<CheckoutFailedSkeleton />}>
      <CheckoutFailedContent />
    </Suspense>
  );
}

function CheckoutFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId') ?? '';
  const status = searchParams.get('status');
  const reason = searchParams.get('reason');

  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const storedDraft = loadOrderDraft(orderId);
    if (storedDraft) {
      setOrderDraft(storedDraft);
    }
  }, [orderId]);

  if (!orderId) {
    return (
      <EmptyState
        title="Pembayaran belum diproses"
        description="Kami tidak menemukan pesanan yang dimaksud. Silakan kembali ke keranjang."
        action={{ label: 'Kembali ke keranjang', onClick: () => router.push('/cart') }}
      />
    );
  }

  const totals = orderDraft?.totals ?? null;

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold">Pembayaran Belum Berhasil</h1>
        <p className="text-sm text-muted-foreground">
          Status terbaru untuk pesanan{' '}
          <span className="font-semibold text-foreground">{orderId}</span>{' '}
          {status ? `adalah ${status}.` : 'belum kami terima.'}
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {reason && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-900">Alasan Kegagalan:</h3>
            <p className="mt-1 text-sm text-red-800">{reason}</p>
          </div>
        )}

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="font-semibold text-yellow-900">Apa yang harus dilakukan?</h3>
          <ul className="mt-2 space-y-1 text-sm text-yellow-800">
            <li>• Coba lakukan pembayaran lagi dengan memilih tombol di bawah</li>
            <li>• Pastikan saldo atau limit kartu mencukupi</li>
            <li>• Jika masalah berlanjut, hubungi customer service kami</li>
          </ul>
        </div>

        {orderDraft && (
          <>
            <section className="space-y-3 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Detail Pengiriman</h2>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">
                  {orderDraft.address.fullName} • {orderDraft.address.phone}
                </p>
                <p className="text-muted-foreground">{orderDraft.address.detail}</p>
                <p className="text-muted-foreground">
                  {orderDraft.address.district}, {orderDraft.address.city}
                </p>
                <p className="text-muted-foreground">
                  {orderDraft.address.province} {orderDraft.address.postalCode}
                </p>
              </div>
            </section>

            {orderDraft.paymentMethod && (
              <section className="space-y-3 rounded-lg border p-6">
                <h2 className="text-lg font-semibold">Metode Pembayaran</h2>
                <p className="text-sm text-muted-foreground">
                  {PAYMENT_METHOD_LABELS[
                    orderDraft.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS
                  ] || orderDraft.paymentMethod}
                </p>
              </section>
            )}
          </>
        )}

        {totals ? <OrderSummary totals={totals} /> : null}

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href={`/checkout/review?orderId=${encodeURIComponent(orderId)}`}>
              Coba Bayar Lagi
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/cart">Kembali ke Keranjang</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/products">Belanja Dulu</Link>
          </Button>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          <p>
            Butuh bantuan? Hubungi customer service kami di{' '}
            <a href="mailto:support@toko.com" className="font-medium text-primary hover:underline">
              support@toko.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckoutFailedSkeleton() {
  return (
    <div className="space-y-6 text-center">
      <div className={cn('mx-auto h-8 w-72 rounded bg-muted animate-pulse', 'prm:no-anim')} />
      <div className={cn('mx-auto h-6 w-80 rounded bg-muted animate-pulse', 'prm:no-anim')} />
      <div
        className={cn(
          'mx-auto h-48 w-full max-w-2xl rounded-lg border bg-muted animate-pulse',
          'prm:no-anim',
        )}
      />
    </div>
  );
}
