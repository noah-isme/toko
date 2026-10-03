/** @jsxImportSource react */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useId, useMemo, useState } from 'react';

import { MobileTotalBar } from '../_components/MobileTotalBar';
import { OrderSummary } from '../_components/OrderSummary';

import { PaymentInstructionsPanel } from './_components/PaymentInstructionsPanel';
import { PaymentStatusWatcher } from './_components/PaymentStatusWatcher';
import { ReviewPageSkeleton } from './_components/ReviewPageSkeleton';
import {
  PaymentMethodPanel,
  PaymentStatusErrorAlert,
  ReviewAddressSection,
  ReviewHeader,
} from './_components/ReviewSections';
import { formatCountdown } from './_lib/countdown';
import { formatDraftAddressLines, getFallbackTotals } from './_lib/summary';

import { EmptyState } from '@/components/empty-state';
import { useCartQuery } from '@/entities/cart/hooks';
import type { ApiError } from '@/entities/checkout/api/client';
import type { OrderDraft } from '@/entities/checkout/api/hooks';
import { loadOrderDraft } from '@/entities/checkout/utils/draftStorage';
import { useCreatePaymentIntentMutation } from '@/entities/payment/api/hooks';
import type { PaymentCreateBody, PaymentIntent, PaymentStatus } from '@/entities/payment/schemas';
import { queryKeys } from '@/lib/api/queryKeys';
import { paymentApi } from '@/lib/api/services/payment';
import type { PaymentInstructions } from '@/lib/api/services/payment';
import { getPayNowRule, normalizeDisabledMessage } from '@/shared/lib/disabledRules';
import { useToast } from '@/shared/ui/toast';

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
  const [manualCheckToken, setManualCheckToken] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null);

  const { data: cart } = useCartQuery();
  const queryClient = useQueryClient();
  const createPaymentIntentMutation = useCreatePaymentIntentMutation();
  const { toast: pushToast } = useToast();
  const payNowHintDomId = useId();
  const supportLink = useMemo(
    () => `mailto:support@toko.com?subject=${encodeURIComponent(`Bantuan pembayaran ${orderId}`)}`,
    [orderId],
  );

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const storedDraft = loadOrderDraft(orderId);
    if (storedDraft) {
      // Draft lives in client-only sessionStorage; reading it post-mount avoids
      // a hydration mismatch, so syncing into state here is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrderDraft(storedDraft);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    void paymentApi
      .getInstructions(orderId)
      .then(setPaymentInstructions)
      .catch(() => setPaymentInstructions(null));
  }, [orderId]);

  useEffect(() => {
    if (!paymentIntent?.expiresAt) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [paymentIntent?.expiresAt]);

  useEffect(() => {
    if (orderId && orderDraft) {
      // Activate the payment-status watcher once the draft (loaded from storage
      // in the effect above) is available; toggling it back off is handled elsewhere.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWatcherActive(true);
    }
  }, [orderDraft, orderId]);

  const totals = useMemo(
    () => orderDraft?.totals ?? getFallbackTotals(cart?.subtotal?.amount),
    [cart?.subtotal?.amount, orderDraft?.totals],
  );

  const paymentExpiryTime = paymentIntent?.expiresAt
    ? new Date(paymentIntent.expiresAt).getTime()
    : null;
  const countdownLabel = paymentExpiryTime ? formatCountdown(paymentExpiryTime - now) : null;
  const paymentExpired = paymentExpiryTime !== null && paymentExpiryTime - now <= 0;
  const pendingTooLong = paymentExpiryTime !== null && paymentExpiryTime - now < 15 * 60 * 1000;

  const addressLines = useMemo(
    () => (orderDraft?.address ? formatDraftAddressLines(orderDraft.address) : null),
    [orderDraft?.address],
  );

  const handlePayNow = useCallback(
    async (override?: PaymentCreateBody) => {
      const payload = override ?? {
        orderId,
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
    }

    setPaymentError('URL pembayaran tidak tersedia. Silakan coba lagi.');
  }, [paymentIntent, setPaymentError]);

  const handleStartWatcher = useCallback(() => {
    setStatusError(null);
    setFailedStatus(null);
    setWatcherActive(true);
    setManualCheckToken((prev) => prev + 1);
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

  const handleStatusFailed = useCallback(
    (status: PaymentStatus['status']) => {
      setWatcherActive(false);
      setFailedStatus(status);
      setStatusError(`Pembayaran belum berhasil (status: ${status}). Silakan coba lagi.`);
      pushToast({
        id: `payment-failed-${orderId}`,
        title: 'Pembayaran belum berhasil',
        description: `Status pembayaran: ${status}`,
        variant: 'destructive',
      });
    },
    [orderId, pushToast],
  );

  const handleStatusError = useCallback(
    (message: string) => {
      setWatcherActive(false);
      setStatusError(message);
      pushToast({
        id: `payment-status-error-${orderId}`,
        title: 'Gagal memeriksa pembayaran',
        description: message,
        variant: 'destructive',
      });
    },
    [orderId, pushToast],
  );

  if (!orderId) {
    return (
      <EmptyState
        title="Tidak menemukan pesanan"
        description="Kami tidak dapat menemukan orderId pada tautan ini."
        action={{ label: 'Kembali ke keranjang', onClick: () => router.push('/cart') }}
      />
    );
  }

  const prefetchSuccess = () => {
    if (typeof router.prefetch === 'function') {
      void router.prefetch(successRoute);
    }
  };

  return (
    <div className="space-y-8 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <ReviewHeader orderId={orderId} />
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {addressLines ? <ReviewAddressSection lines={addressLines} /> : null}

          <PaymentMethodPanel
            isPending={createPaymentIntentMutation.isPending}
            payDisabled={payNowRule.disabled}
            payHintId={payNowHintId}
            payHintMessage={payNowRule.message}
            onPayNow={handlePayNow}
            onPrefetch={prefetchSuccess}
            paymentIntent={paymentIntent}
            onOpenGateway={handleOpenPaymentGateway}
            onStartWatcher={handleStartWatcher}
            watcherActive={watcherActive}
            countdownLabel={countdownLabel}
            paymentExpired={paymentExpired}
            pendingTooLong={pendingTooLong}
            supportLink={supportLink}
            paymentError={paymentError}
          />

          {statusError ? (
            <PaymentStatusErrorAlert
              message={statusError}
              orderId={orderId}
              failedStatus={failedStatus}
              onRetry={() => {
                setStatusError(null);
                setFailedStatus(null);
                setWatcherActive(false);
              }}
            />
          ) : null}

          {paymentInstructions ? (
            <PaymentInstructionsPanel orderId={orderId} instructions={paymentInstructions} />
          ) : null}

          <PaymentStatusWatcher
            orderId={orderId}
            active={watcherActive}
            manualCheckToken={manualCheckToken}
            onPaid={handleStatusPaid}
            onFailed={handleStatusFailed}
            onError={handleStatusError}
          />
        </div>
        <aside id="checkout-review-summary" className="hidden lg:sticky lg:top-24 lg:block">
          <OrderSummary totals={totals} />
        </aside>
      </div>
      <MobileTotalBar
        total={totals.total}
        onShowDetails={() => {
          const target = document.getElementById('checkout-review-summary');
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
    </div>
  );
}
