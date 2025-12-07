/** @jsxImportSource react */
'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { OrderSummary } from '../_components/OrderSummary';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import type { OrderDraft } from '@/entities/checkout/api/hooks';
import { clearOrderDraft, loadOrderDraft } from '@/entities/checkout/utils/draftStorage';
import { PAYMENT_METHOD_LABELS } from '@/lib/api/constants';
import { cn } from '@/lib/utils';
import { JsonLd } from '@/shared/seo/JsonLd';
import { orderJsonLd } from '@/shared/seo/jsonld';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessSkeleton />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId') ?? '';

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

  useEffect(() => {
    if (!orderId) {
      return;
    }

    clearOrderDraft(orderId);
  }, [orderId]);

  if (!orderId) {
    return (
      <EmptyState
        title="Pembayaran berhasil"
        description="Pesanan Anda sudah tercatat. Kembali ke katalog untuk melanjutkan belanja."
        action={{ label: 'Kembali berbelanja', onClick: () => router.push('/products') }}
      />
    );
  }

  const totals = orderDraft?.totals ?? null;
  const orderDetailHref = `/orders/${encodeURIComponent(orderId)}` as Route;
  const structuredData = totals
    ? orderJsonLd({
        orderId,
        url: orderDetailHref,
        total: totals.total,
        acceptedOffers: [
          {
            name: 'Order total',
            price: totals.total,
          },
        ],
      })
    : null;

  return (
    <div className="space-y-8">
      <JsonLd id="order-jsonld" data={structuredData} />
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold">Pembayaran Berhasil! 🎉</h1>
        <p className="text-sm text-muted-foreground">
          Terima kasih! Pesanan Anda dengan nomor{' '}
          <span className="font-semibold text-foreground">{orderId}</span> telah berhasil dibuat.
        </p>
      </div>
      <div className="mx-auto max-w-2xl space-y-6">
        {orderDraft ? (
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
                <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-medium">Instruksi Pembayaran:</p>
                  <p className="mt-1">
                    Silakan lakukan pembayaran sesuai metode yang dipilih. Email konfirmasi telah
                    dikirim ke alamat email Anda dengan detail pembayaran.
                  </p>
                </div>
              </section>
            )}
          </>
        ) : null}

        {totals ? <OrderSummary totals={totals} /> : null}

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href={orderDetailHref}>Lihat detail pesanan</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/products">Belanja Lagi</Link>
          </Button>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          <p>Email konfirmasi telah dikirim. Periksa inbox atau folder spam Anda.</p>
        </div>
      </div>
    </div>
  );
}

function CheckoutSuccessSkeleton() {
  return (
    <div className="space-y-6 text-center">
      <div className={cn('mx-auto h-8 w-64 rounded bg-muted animate-pulse', 'prm:no-anim')} />
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
