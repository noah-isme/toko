/** @jsxImportSource react */
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { OrderSummary } from '../_components/OrderSummary';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import type { OrderDraft } from '@/entities/checkout/api/hooks';
import { clearOrderDraft, loadOrderDraft } from '@/entities/checkout/utils/draftStorage';

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

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Pembayaran Berhasil 🎉</h1>
        <p className="text-sm text-muted-foreground">
          Terima kasih! Pembayaran untuk pesanan <span className="font-semibold">{orderId}</span>{' '}
          telah kami terima.
        </p>
      </div>
      <div className="mx-auto max-w-2xl space-y-6">
        {orderDraft ? (
          <section className="space-y-2 rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Detail Pengiriman</h2>
            <p className="text-sm text-muted-foreground">
              {orderDraft.address.fullName} • {orderDraft.address.phone}
            </p>
            <p className="text-sm text-muted-foreground">{orderDraft.address.detail}</p>
            <p className="text-sm text-muted-foreground">
              {orderDraft.address.district}, {orderDraft.address.city}
            </p>
            <p className="text-sm text-muted-foreground">
              {orderDraft.address.province} {orderDraft.address.postalCode}
            </p>
          </section>
        ) : null}
        {totals ? <OrderSummary totals={totals} /> : null}
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/account">Lihat Pesanan</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/products">Belanja Lagi</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CheckoutSuccessSkeleton() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mx-auto h-6 w-80 animate-pulse rounded bg-muted" />
      <div className="mx-auto h-48 w-full max-w-2xl animate-pulse rounded-lg border bg-muted" />
    </div>
  );
}
