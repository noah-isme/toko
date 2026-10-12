'use client';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import { CancelOrderModal } from '@/components/cancel-order-modal';
import { Button } from '@/components/ui/button';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { useCancelOrderMutation, useOrderQuery } from '@/entities/orders/api/hooks';
import { formatCurrency, formatDateTime } from '@/lib/api/utils';
import { humanizeStatus, orderStatusLabel } from '@/shared/i18n/status';
import { OrderTrackingSkeleton } from '@/shared/ui/skeletons/OrderTrackingSkeleton';
import { useToast } from '@/shared/ui/toast';
import { useCartStore } from '@/stores/cart-store';

type ConfirmationTranslator = ReturnType<typeof useTranslations<'account.confirmation'>>;
type StatusKey =
  | 'pending_payment'
  | 'paid'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  pending_payment: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  paid: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  packed: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  shipped: {
    icon: CheckCircle2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  out_for_delivery: {
    icon: CheckCircle2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  delivered: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

function getStatusConfig(t: ConfirmationTranslator, status: string) {
  const s = status.toLowerCase();
  const config = STATUS_CONFIG[s];
  if (config) {
    const key = s as StatusKey;
    return { ...config, label: t(`status.${key}.label`), message: t(`status.${key}.message`) };
  }
  return {
    icon: Clock,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    label: humanizeStatus(status),
    message: t('status.fallbackMessage'),
  };
}

export default function OrderConfirmationPage() {
  const t = useTranslations('account.confirmation');
  const tAccount = useTranslations('account');
  const params = useParams();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : null;
  const router = useRouter();
  const { toast } = useToast();
  const [isCancelOpen, setCancelOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const { cartId } = useCartStore();
  const addToCartMutation = useAddToCartMutation();

  const { data: order, isLoading, error } = useOrderQuery(orderId || '');
  const cancelMutation = useCancelOrderMutation(orderId || '');
  const normalizedStatus = order?.status?.toLowerCase() ?? '';
  const isPendingPayment = normalizedStatus.includes('pending');
  const paymentExpiryTime = order?.payment?.paymentExpiry
    ? new Date(order.payment.paymentExpiry).getTime()
    : null;

  useEffect(() => {
    if (!orderId) {
      router.replace('/404' as Route);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (!isPendingPayment) {
      return;
    }
    const intervalMs = paymentExpiryTime ? 1000 : 60000;
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [isPendingPayment, paymentExpiryTime]);

  const canCancel = useMemo(() => normalizedStatus === 'pending_payment', [normalizedStatus]);
  const statusTimeline = useMemo(() => {
    if (!order) return [];
    const rawHistory = order.statusHistory ?? [];
    const history = rawHistory.length
      ? rawHistory
      : [{ status: order.status, timestamp: order.createdAt }];
    return [...history].sort(
      (a, b) =>
        new Date(a.timestamp ?? a.at ?? '').getTime() -
        new Date(b.timestamp ?? b.at ?? '').getTime(),
    );
  }, [order]);

  const handleReorder = async () => {
    if (!order?.items?.length) {
      return;
    }

    setIsReordering(true);
    setReorderError(null);
    try {
      if (!cartId) {
        throw new Error(t('cartNotReady'));
      }

      for (const item of order.items) {
        await addToCartMutation.mutateAsync({
          productId: item.productId,
          quantity: Number(item.qty) || 1,
          name: item.productTitle,
          price: {
            amount: Number(item.unitPrice) || 0,
            currency: order.currency || 'IDR',
          },
          image: item.imageUrl ?? null,
          cartId: cartId,
        });
      }

      toast({
        variant: 'success',
        title: t('reorderSuccess'),
        description: t('reorderSuccessDescription'),
      });
      router.push('/cart');
    } catch (reorderFailure) {
      setReorderError(t('reorderFailed'));
    } finally {
      setIsReordering(false);
    }
  };

  if (!orderId) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
          <XCircle className="h-12 w-12 text-slate-500" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">{t('notFoundTitle')}</h1>
        <p className="mb-8 text-muted-foreground">{t('notFoundDescription')}</p>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/account/orders">{t('viewMyOrders')}</Link>
          </Button>
          <Button asChild>
            <Link href="/">{t('continueShopping')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <OrderTrackingSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-12 w-12 text-amber-600" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">{t('createdTitle')}</h1>
        <p className="mb-6 text-xl text-muted-foreground">
          {t.rich('orderId', {
            orderId,
            mono: (chunks) => <span className="font-mono">{chunks}</span>,
          })}
        </p>
        <p className="mb-8 text-muted-foreground">{t('processing')}</p>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/account/orders">{t('viewMyOrders')}</Link>
          </Button>
          <Button asChild>
            <Link href="/">{t('continueShopping')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const config = getStatusConfig(t, order.status);
  const StatusIcon = config.icon;
  const timeRemainingMs = paymentExpiryTime ? paymentExpiryTime - now : null;
  const countdownLabel = timeRemainingMs !== null ? formatCountdown(timeRemainingMs) : null;
  const paymentExpired = timeRemainingMs !== null && timeRemainingMs <= 0;
  const pendingTooLong =
    isPendingPayment && now - new Date(order.createdAt).getTime() > 2 * 60 * 60 * 1000;
  const supportLink = `mailto:support@toko.com?subject=${encodeURIComponent(
    t('supportSubject', { orderNumber: order.orderNumber }),
  )}`;

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div
        className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full ${config.bgColor}`}
      >
        <StatusIcon className={`h-12 w-12 ${config.color}`} />
      </div>

      <h1 className="mb-2 text-3xl font-bold">{config.label}</h1>
      <p className="mb-6 text-xl text-muted-foreground">{config.message}</p>

      <div className="mb-8 w-full max-w-2xl space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm text-muted-foreground">{t('orderNumber')}</p>
          <p className="font-mono text-lg font-medium">{order.orderNumber}</p>
        </div>
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground">{t('totalPayment')}</p>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: order.currency || 'IDR',
            }).format(order.pricing?.total || 0)}
          </p>
        </div>
        {isPendingPayment ? (
          <div className="space-y-3 border-t pt-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">{t('completePayment')}</p>
              {countdownLabel && !paymentExpired ? (
                <p className="mt-1">
                  {t.rich('timeLeft', {
                    countdown: countdownLabel,
                    strong: (chunks) => <span className="font-semibold">{chunks}</span>,
                  })}
                </p>
              ) : paymentExpired ? (
                <p className="mt-1">{t('expired')}</p>
              ) : (
                <p className="mt-1">{t('payPrompt')}</p>
              )}
              {order.payment?.paymentExpiry ? (
                <p className="mt-1 text-xs text-amber-800">
                  {t('validUntil', { date: formatDateTime(order.payment.paymentExpiry) })}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-amber-800">{t('autoCancel')}</p>
            </div>
            {order.payment?.paymentUrl ? (
              <Button asChild className="w-full" size="lg">
                <a href={order.payment.paymentUrl} target="_blank" rel="noopener noreferrer">
                  {t('payNow')}
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noPaymentLink')}</p>
            )}
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href={`/checkout/review?orderId=${encodeURIComponent(order.id)}`}>
                {t('retryPayment')}
              </Link>
            </Button>
            {pendingTooLong ? (
              <Button asChild variant="ghost" className="w-full" size="sm">
                <a href={supportLink}>{t('contactSupport')}</a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-8 w-full max-w-2xl space-y-6 text-left">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">{t('statusTitle')}</h2>
          <ol className="mt-4 space-y-4">
            {statusTimeline.map((item, index) => {
              const statusLabel =
                orderStatusLabel(tAccount, item.status) ?? item.status.replace(/_/g, ' ');
              const isLast = index === statusTimeline.length - 1;
              const isCurrent = item.status.toLowerCase() === normalizedStatus;
              return (
                <li key={`${item.status}-${item.timestamp}`} className="relative pl-6">
                  <span
                    className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${isCurrent ? 'bg-primary' : 'bg-muted-foreground/60'}`}
                    aria-hidden="true"
                  />
                  {!isLast ? (
                    <span
                      className="absolute left-[4px] top-4 h-full w-px bg-border"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{statusLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(item.timestamp ?? item.at ?? '')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">{t('shippingTitle')}</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {order.shipping ? (
              <>
                <p>
                  {t.rich('courier', {
                    courier: order.shipping.courier,
                    strong: (chunks) => (
                      <span className="font-medium text-foreground">{chunks}</span>
                    ),
                  })}
                </p>
                <p>
                  {t.rich('service', {
                    service: order.shipping.service,
                    strong: (chunks) => (
                      <span className="font-medium text-foreground">{chunks}</span>
                    ),
                  })}
                </p>
                {order.shipping.trackingNumber ? (
                  <p>
                    {t.rich('trackingNumber', {
                      number: order.shipping.trackingNumber,
                      strong: (chunks) => (
                        <span className="font-medium text-foreground">{chunks}</span>
                      ),
                    })}
                  </p>
                ) : (
                  <p>{t('trackingPending')}</p>
                )}
                {order.shipping.estimatedDelivery ? (
                  <p>
                    {t.rich('eta', {
                      date: formatDateTime(order.shipping.estimatedDelivery),
                      strong: (chunks) => (
                        <span className="font-medium text-foreground">{chunks}</span>
                      ),
                    })}
                  </p>
                ) : null}
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/order/tracking/${order.id}`}>{t('trackShipment')}</Link>
                  </Button>
                </div>
              </>
            ) : (
              <p>{t('shippingPending')}</p>
            )}
          </div>
        </section>
        {order.items?.length ? (
          <section className="rounded-lg border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t('itemsTitle')}</h2>
                <p className="text-sm text-muted-foreground">{t('itemsDescription')}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReorder}
                disabled={isReordering}
              >
                {isReordering ? t('reordering') : t('reorder')}
              </Button>
            </div>
            {reorderError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {reorderError}
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productTitle}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted" aria-hidden="true" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-foreground">{item.productTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('qtyPrice', {
                        qty: item.qty,
                        price: formatCurrency(Number(item.unitPrice) || 0, order.currency || 'IDR'),
                      })}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(Number(item.subtotal) || 0, order.currency || 'IDR')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/products/${item.productSlug}`}>{t('viewProduct')}</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/products/${item.productSlug}#reviews`}>{t('review')}</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {canCancel ? (
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            {t('cancelOrder')}
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/account/orders">{t('viewMyOrders')}</Link>
        </Button>
        <Button asChild>
          <Link href="/">{t('continueShopping')}</Link>
        </Button>
      </div>
      <CancelOrderModal
        open={isCancelOpen}
        onOpenChange={setCancelOpen}
        isSubmitting={cancelMutation.isPending}
        onConfirm={async (reason, note) => {
          try {
            await cancelMutation.mutateAsync();
            toast({
              variant: 'success',
              title: t('toast.cancelled'),
              description: t('toast.cancelledDescription'),
            });
            setCancelOpen(false);
          } catch (error) {
            toast({
              variant: 'destructive',
              description: t('toast.cancelFailed'),
            });
          }
        }}
      />
    </div>
  );
}

function formatCountdown(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}
