'use client';

import { Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { CancelOrderModal } from '@/components/cancel-order-modal';
import { Button } from '@/components/ui/button';
import { useCancelOrderMutation, useOrderQuery } from '@/entities/orders/api/hooks';
import { ORDER_STATUS_LABELS } from '@/lib/api/constants';
import { formatCurrency, formatDateTime } from '@/lib/api/utils';
import { EmptyState } from '@/shared/ui/EmptyState';
import { OrderTrackingSkeleton } from '@/shared/ui/skeletons/OrderTrackingSkeleton';
import { useToast } from '@/shared/ui/toast';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';
  const { data: order, isLoading, error } = useOrderQuery(orderId);
  const [isCancelOpen, setCancelOpen] = useState(false);
  const cancelMutation = useCancelOrderMutation(orderId);
  const { toast } = useToast();

  if (!orderId) {
    return (
      <EmptyState
        title="Pesanan tidak ditemukan"
        description="ID pesanan tidak tersedia. Silakan kembali ke daftar pesanan."
        cta={{ label: 'Lihat pesanan saya', href: '/account/orders' }}
      />
    );
  }

  if (isLoading) {
    return <OrderTrackingSkeleton />;
  }

  if (error || !order) {
    return (
      <EmptyState
        title="Detail pesanan belum tersedia"
        description="Kami belum dapat memuat detail pesanan ini. Coba lagi nanti."
        cta={{ label: 'Kembali ke pesanan', href: '/account/orders' }}
      />
    );
  }

  const currency = order.currency || 'IDR';
  const statusLabel = getStatusLabel(order.status, order.statusLabel);
  const statusClass = getStatusColor(order.status);
  const isPendingPayment = order.status.toLowerCase().includes('pending');
  const canCancel =
    order.status.toLowerCase().includes('pending') ||
    order.status.toLowerCase().includes('processing');
  const timeline = buildStatusTimeline(order);

  const handleDownloadInvoice = () => {
    const invoiceText = buildInvoiceText(order);
    const blob = new Blob([invoiceText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${order.orderNumber || order.id}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Nomor pesanan</p>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">Dibuat {formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {isPendingPayment ? (
          <Button asChild>
            <Link href={`/order/confirmation/${order.id}`}>Bayar sekarang</Link>
          </Button>
        ) : null}
        {order.shipping?.trackingNumber ? (
          <Button asChild variant="outline">
            <Link href={`/order/tracking/${order.id}`}>Lacak pengiriman</Link>
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={handleDownloadInvoice} className="gap-2">
          <Download className="h-4 w-4" />
          Unduh invoice
        </Button>
        {canCancel ? (
          <Button type="button" variant="destructive" onClick={() => setCancelOpen(true)}>
            Batalkan pesanan
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Produk dalam pesanan</h2>
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
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted" aria-hidden="true" />
                  )}
                  <div className="flex-1 space-y-1">
                    <Link href={`/products/${item.productSlug}`} className="font-medium">
                      {item.productTitle}
                    </Link>
                    {item.variantName ? (
                      <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Qty {item.qty} - {formatCurrency(Number(item.unitPrice) || 0, currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="font-semibold">
                      {formatCurrency(Number(item.subtotal) || 0, currency)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Status pesanan</h2>
            <ol className="mt-4 space-y-4">
              {timeline.map((entry, index) => {
                const isLast = index === timeline.length - 1;
                return (
                  <li key={`${entry.status}-${entry.timestamp}-${index}`} className="relative pl-6">
                    <span
                      className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {!isLast ? (
                      <span
                        className="absolute left-[4px] top-4 h-full w-px bg-border"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {getStatusLabel(entry.status, entry.label)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.timestamp)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ringkasan pembayaran
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{statusLabel}</span>
              </div>
              {order.payment ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Metode</span>
                    <span className="font-medium">{order.payment.method}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status bayar</span>
                    <span className="font-medium">{order.payment.status}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Informasi pembayaran akan muncul setelah pesanan diproses.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Alamat pengiriman
            </h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium">{order.shippingAddress.receiverName}</p>
              <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
              <p className="text-muted-foreground">{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 ? (
                <p className="text-muted-foreground">{order.shippingAddress.addressLine2}</p>
              ) : null}
              <p className="text-muted-foreground">
                {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                {order.shippingAddress.postalCode}
              </p>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Rincian biaya
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(order.pricing.subtotal, currency)}
                </span>
              </div>
              {order.pricing.discount ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="font-medium">
                    -{formatCurrency(order.pricing.discount, currency)}
                  </span>
                </div>
              ) : null}
              {order.pricing.tax ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pajak</span>
                  <span className="font-medium">{formatCurrency(order.pricing.tax, currency)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ongkir</span>
                <span className="font-medium">
                  {formatCurrency(order.pricing.shipping, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.pricing.total, currency)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pengiriman
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              {order.shipping ? (
                <>
                  <p className="font-medium">
                    {order.shipping.courier} - {order.shipping.service}
                  </p>
                  {order.shipping.trackingNumber ? (
                    <p className="text-muted-foreground">Resi: {order.shipping.trackingNumber}</p>
                  ) : (
                    <p className="text-muted-foreground">
                      Nomor resi akan tersedia setelah pesanan diproses.
                    </p>
                  )}
                  {order.shipping.estimatedDelivery ? (
                    <p className="text-muted-foreground">
                      Estimasi tiba {formatDateTime(order.shipping.estimatedDelivery)}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Informasi pengiriman akan muncul setelah pesanan diproses.
                </p>
              )}
            </div>
          </section>
        </div>
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
              description: 'Pesanan Anda sudah dibatalkan.',
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

function buildStatusTimeline(order: {
  status: string;
  statusLabel?: string | null;
  createdAt: string;
  statusHistory?: Array<{
    status: string;
    label?: string | null;
    at?: string | null;
    timestamp?: string | null;
  }> | null;
}) {
  const history = order.statusHistory?.length
    ? order.statusHistory
    : [{ status: order.status, label: order.statusLabel ?? undefined, timestamp: order.createdAt }];

  return [...history]
    .map((entry) => ({
      ...entry,
      timestamp: entry.timestamp || entry.at || order.createdAt,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function getStatusLabel(status: string, fallback?: string | null) {
  const label = ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS]?.label;
  return fallback || label || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (
    s.includes('paid') ||
    s.includes('shipped') ||
    s.includes('completed') ||
    s.includes('success')
  ) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (s.includes('pending') || s.includes('wait')) {
    return 'bg-amber-100 text-amber-700';
  }
  if (s.includes('cancel') || s.includes('fail')) {
    return 'bg-red-100 text-red-700';
  }
  return 'bg-slate-100 text-slate-700';
}

function buildInvoiceText(order: {
  id: string;
  orderNumber: string;
  createdAt: string;
  currency: string;
  user: { name: string; email: string };
  shippingAddress: {
    receiverName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    productTitle: string;
    variantName?: string | null;
    qty: number;
    unitPrice: number;
    subtotal: number;
  }>;
  pricing: {
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    total: number;
  };
  shipping?: {
    courier: string;
    service: string;
    trackingNumber?: string | null;
    estimatedDelivery?: string | null;
  } | null;
}) {
  const currency = order.currency || 'IDR';
  const address = [
    order.shippingAddress.addressLine1,
    order.shippingAddress.addressLine2,
    order.shippingAddress.city,
    order.shippingAddress.province,
    order.shippingAddress.postalCode,
    order.shippingAddress.country,
  ]
    .filter(Boolean)
    .join(', ');

  const lines = [
    `Invoice #${order.orderNumber || order.id}`,
    `Tanggal: ${formatDateTime(order.createdAt)}`,
    '',
    `Pelanggan: ${order.user.name}`,
    `Email: ${order.user.email}`,
    '',
    'Alamat pengiriman:',
    `${order.shippingAddress.receiverName} (${order.shippingAddress.phone})`,
    address,
    '',
    'Produk:',
    ...order.items.map((item) => {
      const variant = item.variantName ? ` (${item.variantName})` : '';
      return `- ${item.productTitle}${variant} x${item.qty} @ ${formatCurrency(
        Number(item.unitPrice) || 0,
        currency,
      )} = ${formatCurrency(Number(item.subtotal) || 0, currency)}`;
    }),
    '',
    `Subtotal: ${formatCurrency(order.pricing.subtotal, currency)}`,
    `Diskon: ${formatCurrency(order.pricing.discount, currency)}`,
    `Pajak: ${formatCurrency(order.pricing.tax, currency)}`,
    `Ongkir: ${formatCurrency(order.pricing.shipping, currency)}`,
    `Total: ${formatCurrency(order.pricing.total, currency)}`,
  ];

  if (order.shipping) {
    lines.push('');
    lines.push(`Kurir: ${order.shipping.courier} - ${order.shipping.service}`);
    if (order.shipping.trackingNumber) {
      lines.push(`Nomor resi: ${order.shipping.trackingNumber}`);
    }
    if (order.shipping.estimatedDelivery) {
      lines.push(`Estimasi tiba: ${formatDateTime(order.shipping.estimatedDelivery)}`);
    }
  }

  return lines.join('\n');
}
