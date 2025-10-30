/** @jsxImportSource react */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useId, useMemo, useState } from 'react';

import { OrderSummary } from '../_components/OrderSummary';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import type { ApiError } from '@/entities/checkout/api/client';
import type { OrderDraft } from '@/entities/checkout/api/hooks';
import { loadOrderDraft } from '@/entities/checkout/utils/draftStorage';
import {
  useCreatePaymentIntentMutation,
  usePaymentStatusQuery,
} from '@/entities/payment/api/hooks';
import type { PaymentCreateBody, PaymentIntent, PaymentStatus } from '@/entities/payment/schemas';
import { useCartQuery } from '@/lib/api/hooks';
import { queryKeys } from '@/lib/api/queryKeys';
import { cn } from '@/lib/utils';
import { getPayNowRule, normalizeDisabledMessage } from '@/shared/lib/disabledRules';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { DisabledHint } from '@/shared/ui/DisabledHint';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { useToast } from '@/shared/ui/toast';

const failureStatuses: Array<PaymentStatus['status']> = ['FAILED', 'EXPIRED', 'CANCELED'];

export default function CheckoutReviewPage() {
  return (
    <Suspense fallback={<ReviewPageSkeleton />}>
      <CheckoutReviewContent />
    </Suspense>
  );
}

function CheckoutReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId') ?? '';

  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [failedStatus, setFailedStatus] = useState<PaymentStatus['status'] | null>(null);
  const [watcherActive, setWatcherActive] = useState(false);

  const { data: cart } = useCartQuery();
  const queryClient = useQueryClient();
  const createPaymentIntentMutation = useCreatePaymentIntentMutation();
  const { toast: pushToast } = useToast();
  const payNowHintDomId = useId();

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const storedDraft = loadOrderDraft(orderId);
    if (storedDraft) {
      setOrderDraft(storedDraft);
    }
  }, [orderId]);

  const totals = useMemo(() => {
    if (orderDraft?.totals) {
      return orderDraft.totals;
    }

    const subtotal = cart?.subtotal?.amount ?? 0;
    const discount = 0;
    const shipping = 0;
    const tax = Math.round((subtotal - discount) * 0.11);
    const total = subtotal - discount + tax + shipping;

    return { subtotal, discount, shipping, tax, total };
  }, [cart?.subtotal?.amount, orderDraft?.totals]);

  const addressLines = useMemo(() => {
    if (!orderDraft?.address) {
      return null;
    }

    const { fullName, phone, detail, district, city, province, postalCode } = orderDraft.address;
    return [
      `${fullName} • ${phone}`,
      detail,
      `${district}, ${city}`,
      `${province} ${postalCode}`,
    ].filter(Boolean);
  }, [orderDraft?.address]);

  const handlePayNow = useCallback(
    async (override?: PaymentCreateBody) => {
      const payload = override ?? {
        orderId,
        provider: 'midtrans',
        channel: 'snap',
      };

      if (!payload.orderId) {
        return;
      }

      setPaymentError(null);
      setStatusError(null);
      setFailedStatus(null);
      setWatcherActive(false);

      try {
        const result = await createPaymentIntentMutation.mutateAsync(payload);
        setPaymentIntent(result);
      } catch (error) {
        const apiError = error as ApiError;
        setPaymentIntent(null);
        setPaymentError(
          apiError?.error?.message ?? 'Tidak dapat membuat payment intent. Silakan coba lagi.',
        );
      }
    },
    [createPaymentIntentMutation, orderId],
  );

  useEffect(() => {
    createPaymentIntentMutation.registerRetryHandler((variables) => {
      void handlePayNow(variables);
    });

    return () => {
      createPaymentIntentMutation.registerRetryHandler(undefined);
    };
  }, [createPaymentIntentMutation, handlePayNow]);

  const handleOpenPaymentGateway = useCallback(() => {
    if (!paymentIntent) {
      return;
    }

    const targetUrl = paymentIntent.redirectUrl ?? undefined;

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('Payment intent token received without redirectUrl', paymentIntent);
    }

    setPaymentError('URL pembayaran tidak tersedia. Silakan coba lagi.');
  }, [paymentIntent, setPaymentError]);

  const handleStartWatcher = useCallback(() => {
    setStatusError(null);
    setFailedStatus(null);
    setWatcherActive(true);
  }, []);

  const cartId = orderDraft?.cartId ?? cart?.id ?? null;
  const successRoute = useMemo(() => {
    if (!orderId) {
      return '/checkout/success';
    }

    return `/checkout/success?orderId=${encodeURIComponent(orderId)}` as Route;
  }, [orderId]);

  const payNowRule = normalizeDisabledMessage(
    getPayNowRule({
      hasOrderDraft: Boolean(orderDraft),
      hasOrderId: Boolean(orderId),
      isProcessing: createPaymentIntentMutation.isPending,
    }),
  );
  const payNowHintId = payNowRule.disabled ? payNowHintDomId : undefined;

  const handleStatusPaid = useCallback(() => {
    const encodedOrderId = encodeURIComponent(orderId);

    if (cartId) {
      void queryClient.invalidateQueries({ queryKey: ['cart', cartId] });
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    setWatcherActive(false);
    pushToast({
      id: `payment-success-${orderId}`,
      title: 'Pembayaran berhasil',
      variant: 'success',
    });
    router.push(`/checkout/success?orderId=${encodedOrderId}`);
  }, [cartId, orderId, pushToast, queryClient, router]);

  const handleStatusFailed = useCallback((status: PaymentStatus['status']) => {
    setWatcherActive(false);
    setFailedStatus(status);
    setStatusError(
      status === 'CANCELED'
        ? 'Pembayaran dibatalkan. Silakan mulai ulang proses pembayaran.'
        : `Pembayaran belum berhasil (status: ${status}). Silakan coba lagi.`,
    );
  }, []);

  const handleStatusError = useCallback((message: string) => {
    setWatcherActive(false);
    setStatusError(message);
  }, []);

  if (!orderId) {
    return (
      <EmptyState
        title="Tidak menemukan pesanan"
        description="Kami tidak dapat menemukan orderId pada tautan ini."
        action={{ label: 'Kembali ke keranjang', onClick: () => router.push('/cart') }}
      />
    );
  }

  return (
    <div className="space-y-8 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Review Pesanan</h1>
        <p className="text-sm text-muted-foreground">
          Pastikan detail pesanan Anda sudah benar sebelum melanjutkan ke pembayaran.
        </p>
        <p className="text-xs text-muted-foreground">Order ID: {orderId}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {addressLines ? (
            <section className="space-y-2 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Alamat Pengiriman</h2>
              <div className="space-y-1 text-sm text-muted-foreground">
                {addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-4 rounded-lg border p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Metode Pembayaran</h2>
              <p className="text-sm text-muted-foreground">
                Kami menggunakan Midtrans Snap untuk memproses pembayaran secara aman.
              </p>
            </div>
            <div className="space-y-3">
              <GuardedButton
                type="button"
                size="lg"
                onClick={handlePayNow}
                disabled={payNowRule.disabled}
                isLoading={createPaymentIntentMutation.isPending}
                loadingLabel="Memproses pembayaran…"
                aria-describedby={payNowHintId}
                className="min-h-[44px] px-6"
                onFocus={() => {
                  if (typeof router.prefetch === 'function') {
                    void router.prefetch(successRoute);
                  }
                }}
                onMouseEnter={() => {
                  if (typeof router.prefetch === 'function') {
                    void router.prefetch(successRoute);
                  }
                }}
              >
                Bayar Sekarang
              </GuardedButton>
              <div className="flex justify-start">
                <DelayedLoader
                  active={createPaymentIntentMutation.isPending}
                  label="Menghubungi penyedia pembayaran…"
                  className="text-xs text-muted-foreground"
                />
              </div>
              {payNowRule.disabled && payNowRule.message ? (
                <DisabledHint id={payNowHintId} message={payNowRule.message} />
              ) : null}
              {paymentIntent?.redirectUrl || paymentIntent?.token ? (
                <div className="flex flex-wrap gap-2">
                  {paymentIntent?.redirectUrl ? (
                    <Button asChild variant="secondary" size="sm">
                      <a href={paymentIntent.redirectUrl} target="_blank" rel="noopener noreferrer">
                        Lanjut ke Pembayaran
                      </a>
                    </Button>
                  ) : null}
                  {paymentIntent?.token ? (
                    <Button type="button" size="sm" onClick={handleOpenPaymentGateway}>
                      Buka Pembayaran
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartWatcher}
                    disabled={watcherActive}
                  >
                    Saya Sudah Membayar
                  </Button>
                </div>
              ) : null}
              {paymentIntent?.expiresAt ? (
                <p className="text-xs text-muted-foreground">
                  Selesaikan pembayaran sebelum{' '}
                  {new Date(paymentIntent.expiresAt).toLocaleString('id-ID')}.
                </p>
              ) : null}
              {paymentIntent?.token ? (
                <p className="text-xs text-muted-foreground">
                  Token pembayaran: <span className="font-mono">{paymentIntent.token}</span>
                </p>
              ) : null}
            </div>
            {paymentError ? (
              <div
                className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {paymentError}
              </div>
            ) : null}
          </section>

          {statusError ? (
            <div
              className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              <p>{statusError}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStatusError(null);
                    setFailedStatus(null);
                    setWatcherActive(false);
                  }}
                >
                  Coba Lagi
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link
                    href={`/checkout/failed?orderId=${encodeURIComponent(orderId)}${
                      failedStatus ? `&status=${failedStatus}` : ''
                    }`}
                  >
                    Lihat Detail
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          <PaymentStatusWatcher
            orderId={orderId}
            active={watcherActive}
            onPaid={handleStatusPaid}
            onFailed={handleStatusFailed}
            onError={handleStatusError}
          />
        </div>
        <aside id="checkout-review-summary" className="hidden lg:sticky lg:top-24 lg:block">
          <OrderSummary totals={totals} />
        </aside>
      </div>
      <div className="lg:hidden">
        <div className="sticky bottom-0 z-40 -mx-4 flex items-center justify-between gap-4 border-t border-border/70 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total pembayaran</p>
            <p className="text-lg font-semibold">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                totals.total,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const target = document.getElementById('checkout-review-summary');
              target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="prm:no-anim inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors duration-150 ease-out hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Lihat rincian
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className={cn('h-6 w-40 rounded bg-muted animate-pulse', 'prm:no-anim')} />
        <div className={cn('h-4 w-64 rounded bg-muted animate-pulse', 'prm:no-anim')} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className={cn('h-40 rounded-lg border bg-muted animate-pulse', 'prm:no-anim')} />
          <div className={cn('h-40 rounded-lg border bg-muted animate-pulse', 'prm:no-anim')} />
        </div>
        <div className={cn('h-40 rounded-lg border bg-muted animate-pulse', 'prm:no-anim')} />
      </div>
    </div>
  );
}

interface PaymentStatusWatcherProps {
  orderId: string;
  active: boolean;
  onPaid: () => void;
  onFailed: (status: PaymentStatus['status']) => void;
  onError: (message: string) => void;
}

function PaymentStatusWatcher({
  orderId,
  active,
  onPaid,
  onFailed,
  onError,
}: PaymentStatusWatcherProps) {
  const statusQuery = usePaymentStatusQuery(orderId, { enabled: active && Boolean(orderId) });

  useEffect(() => {
    if (!active) {
      return;
    }

    if (statusQuery.data?.status === 'PAID') {
      onPaid();
      return;
    }

    if (statusQuery.data && failureStatuses.includes(statusQuery.data.status)) {
      onFailed(statusQuery.data.status);
    }
  }, [active, onFailed, onPaid, statusQuery.data]);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (statusQuery.isError) {
      onError('Tidak dapat memeriksa status pembayaran. Silakan coba lagi.');
    }
  }, [active, onError, statusQuery.isError]);

  if (!active) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-4" role="status" aria-live="polite">
      <p className="font-medium">Memeriksa status pembayaran...</p>
      {statusQuery.isFetching ? (
        <p className="text-sm text-muted-foreground">Menghubungi penyedia pembayaran.</p>
      ) : null}
      {statusQuery.data ? (
        <p className="text-sm text-muted-foreground">
          Status saat ini:{' '}
          <span className="font-semibold text-foreground">{statusQuery.data.status}</span>
        </p>
      ) : null}
    </div>
  );
}
