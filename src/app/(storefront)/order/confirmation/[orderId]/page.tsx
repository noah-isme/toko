'use client';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import { CancelOrderModal } from '@/components/cancel-order-modal';
import { Button } from '@/components/ui/button';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { useCancelOrderMutation, useOrderQuery } from '@/entities/orders/api/hooks';
import { ORDER_STATUS_LABELS } from '@/lib/api/constants';
import { formatCurrency, formatDateTime } from '@/lib/api/utils';
import { OrderTrackingSkeleton } from '@/shared/ui/skeletons/OrderTrackingSkeleton';
import { useToast } from '@/shared/ui/toast';
import { useCartStore } from '@/stores/cart-store';

const STATUS_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; label: string; message: string }
> = {
  pending_payment: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Menunggu Pembayaran',
    message: 'Silakan selesaikan pembayaran untuk memproses pesanan Anda.',
  },
  paid: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Pembayaran Berhasil',
    message: 'Pembayaran Anda telah diterima. Pesanan sedang diproses.',
  },
  processing: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Sedang Diproses',
    message: 'Pesanan Anda sedang diproses oleh tim kami.',
  },
  shipped: {
    icon: CheckCircle2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Dalam Pengiriman',
    message: 'Pesanan Anda sedang dalam perjalanan.',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Selesai',
    message: 'Pesanan Anda telah selesai. Terima kasih!',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Dibatalkan',
    message: 'Pesanan ini telah dibatalkan.',
  },
};

function getStatusConfig(status: string) {
  const s = status.toLowerCase().replace(/_/g, '_');
  return (
    STATUS_CONFIG[s] || {
      icon: Clock,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      message: 'Status pesanan Anda.',
    }
  );
}

export default function OrderConfirmationPage() {
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

  const canCancel = useMemo(
    () => normalizedStatus.includes('pending') || normalizedStatus.includes('processing'),
    [normalizedStatus],
  );
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
  }, [order?.createdAt, order?.status, order?.statusHistory]);

  const handleReorder = async () => {
    if (!order?.items?.length) {
      return;
    }

    setIsReordering(true);
    setReorderError(null);
    try {
      if (!cartId) {
        throw new Error('Keranjang belanja belum siap.');
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
        title: 'Produk ditambahkan ke keranjang',
        description: 'Silakan lanjutkan ke checkout untuk memesan ulang.',
      });
      router.push('/cart');
    } catch (reorderFailure) {
      setReorderError('Gagal menambahkan ulang produk ke keranjang. Coba lagi.');
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
        <h1 className="mb-2 text-3xl font-bold">Pesanan tidak ditemukan</h1>
        <p className="mb-8 text-muted-foreground">
          Kami tidak menemukan ID pesanan. Anda akan diarahkan ke halaman 404.
        </p>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/account/orders">Lihat Pesanan Saya</Link>
          </Button>
          <Button asChild>
            <Link href="/">Lanjut Belanja</Link>
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
        <h1 className="mb-2 text-3xl font-bold">Pesanan Dibuat</h1>
        <p className="mb-6 text-xl text-muted-foreground">
          Order ID: <span className="font-mono">{orderId}</span>
        </p>
        <p className="mb-8 text-muted-foreground">
          Detail pesanan sedang diproses. Silakan cek riwayat pesanan Anda.
        </p>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/account/orders">Lihat Pesanan Saya</Link>
          </Button>
          <Button asChild>
            <Link href="/">Lanjut Belanja</Link>
          </Button>
        </div>
      </div>
    );
  }

  const config = getStatusConfig(order.status);
  const StatusIcon = config.icon;
  const timeRemainingMs = paymentExpiryTime ? paymentExpiryTime - now : null;
  const countdownLabel = timeRemainingMs !== null ? formatCountdown(timeRemainingMs) : null;
  const paymentExpired = timeRemainingMs !== null && timeRemainingMs <= 0;
  const pendingTooLong =
    isPendingPayment && now - new Date(order.createdAt).getTime() > 2 * 60 * 60 * 1000;
  const supportLink = `mailto:support@toko.com?subject=${encodeURIComponent(
    `Bantuan pembayaran ${order.orderNumber}`,
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
          <p className="text-sm text-muted-foreground">Nomor Pesanan</p>
          <p className="font-mono text-lg font-medium">{order.orderNumber}</p>
        </div>
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground">Total Pembayaran</p>
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
              <p className="font-medium">Selesaikan pembayaran</p>
              {countdownLabel && !paymentExpired ? (
                <p className="mt-1">
                  Sisa waktu pembayaran: <span className="font-semibold">{countdownLabel}</span>
                </p>
              ) : paymentExpired ? (
                <p className="mt-1">
                  Waktu pembayaran telah berakhir. Silakan buat ulang pembayaran.
                </p>
              ) : (
                <p className="mt-1">Segera selesaikan pembayaran agar pesanan diproses.</p>
              )}
              {order.payment?.paymentExpiry ? (
                <p className="mt-1 text-xs text-amber-800">
                  Berlaku sampai {formatDateTime(order.payment.paymentExpiry)}.
                </p>
              ) : null}
              <p className="mt-2 text-xs text-amber-800">
                Jika pembayaran tertunda, pesanan akan otomatis dibatalkan.
              </p>
            </div>
            {order.payment?.paymentUrl ? (
              <Button asChild className="w-full" size="lg">
                <a href={order.payment.paymentUrl} target="_blank" rel="noopener noreferrer">
                  Bayar Sekarang
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Link pembayaran belum tersedia. Anda bisa membuat ulang pembayaran.
              </p>
            )}
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href={`/checkout/review?orderId=${encodeURIComponent(order.id)}`}>
                Coba bayar lagi
              </Link>
            </Button>
            {pendingTooLong ? (
              <Button asChild variant="ghost" className="w-full" size="sm">
                <a href={supportLink}>Hubungi CS</a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-8 w-full max-w-2xl space-y-6 text-left">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Status pesanan</h2>
          <ol className="mt-4 space-y-4">
            {statusTimeline.map((item, index) => {
              const statusKey = item.status as keyof typeof ORDER_STATUS_LABELS;
              const statusLabel =
                ORDER_STATUS_LABELS[statusKey]?.label ?? item.status.replace(/_/g, ' ');
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
          <h2 className="text-lg font-semibold">Pengiriman</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {order.shipping ? (
              <>
                <p>
                  Kurir:{' '}
                  <span className="font-medium text-foreground">{order.shipping.courier}</span>
                </p>
                <p>
                  Layanan:{' '}
                  <span className="font-medium text-foreground">{order.shipping.service}</span>
                </p>
                {order.shipping.trackingNumber ? (
                  <p>
                    Nomor resi:{' '}
                    <span className="font-medium text-foreground">
                      {order.shipping.trackingNumber}
                    </span>
                  </p>
                ) : (
                  <p>Nomor resi akan tersedia setelah pesanan diproses.</p>
                )}
                {order.shipping.estimatedDelivery ? (
                  <p>
                    Estimasi tiba:{' '}
                    <span className="font-medium text-foreground">
                      {formatDateTime(order.shipping.estimatedDelivery)}
                    </span>
                  </p>
                ) : null}
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/order/tracking/${order.id}`}>Lacak pengiriman</Link>
                  </Button>
                </div>
              </>
            ) : (
              <p>Informasi pengiriman akan muncul setelah pesanan diproses.</p>
            )}
          </div>
        </section>
        {order.items?.length ? (
          <section className="rounded-lg border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Produk dalam pesanan</h2>
                <p className="text-sm text-muted-foreground">
                  Tambahkan lagi produk yang pernah dibeli.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReorder}
                disabled={isReordering}
              >
                {isReordering ? 'Menambahkan...' : 'Beli lagi'}
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
                    <img
                      src={item.imageUrl}
                      alt={item.productTitle}
                      className="h-16 w-16 rounded-md object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted" aria-hidden="true" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-foreground">{item.productTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {item.qty} -{' '}
                      {formatCurrency(Number(item.unitPrice) || 0, order.currency || 'IDR')}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(Number(item.subtotal) || 0, order.currency || 'IDR')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/products/${item.productSlug}`}>Lihat produk</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/products/${item.productSlug}#reviews`}>Beri ulasan</Link>
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
            Batalkan pesanan
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/account/orders">Lihat Pesanan Saya</Link>
        </Button>
        <Button asChild>
          <Link href="/">Lanjut Belanja</Link>
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
              title: 'Pesanan dibatalkan',
              description:
                'Pesanan Anda sudah dibatalkan. Tim kami akan memproses pengembalian dana jika diperlukan.',
            });
            setCancelOpen(false);
          } catch (error) {
            toast({
              variant: 'destructive',
              description: 'Gagal membatalkan pesanan. Silakan coba lagi.',
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
