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
        <h1 className="text-3xl font-bold">Pembayaran Belum Berhasil</h1>
        <p className="text-sm text-muted-foreground">
          Status terbaru untuk pesanan <span className="font-semibold">{orderId}</span>{' '}
          {status ? `adalah ${status}.` : 'belum kami terima.'}
        </p>
      </div>
      <div className="mx-auto max-w-2xl space-y-6">
        {totals ? <OrderSummary totals={totals} /> : null}
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href={`/checkout/review?orderId=${encodeURIComponent(orderId)}`}>
              Kembali ke Review
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/products">Belanja Dulu</Link>
          </Button>
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
