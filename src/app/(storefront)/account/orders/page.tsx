'use client';

import { ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { Price } from '@/components/price';
import { PullToRefresh } from '@/components/pull-to-refresh';
import { Button } from '@/components/ui/button';
import { useOrdersQuery } from '@/entities/orders/api/hooks';
import type { OrderListItem } from '@/entities/orders/schemas';
import { emptyOrders } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

export default function OrderHistoryPage() {
  const { data, isLoading, error, refetch } = useOrdersQuery({ page: 1, limit: 20 });
  const orders = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Pesanan Saya</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <BaseSkeleton className="mb-2 h-6 w-1/3" />
              <BaseSkeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-8 text-center">
        <p className="font-semibold text-foreground">Gagal memuat riwayat pesanan</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <EmptyState icon={<ShoppingBag aria-hidden="true" />} {...emptyOrders()} />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={refetch} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pesanan Saya</h1>
        <p className="text-muted-foreground">Riwayat transaksi belanja Anda.</p>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </PullToRefresh>
  );
}

function OrderCard({ order }: { order: OrderListItem }) {
  const dateParams = order.createdAt ? new Date(order.createdAt) : new Date();
  const isPending = order.status.toLowerCase().includes('pending');
  const statusLabel = getStatusLabel(order.status);

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {order.thumbnailUrl ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src={order.thumbnailUrl}
              alt={order.orderNumber}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{order.orderNumber}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(dateParams)}
          </p>
          {order.itemCount ? (
            <p className="text-sm text-muted-foreground">{order.itemCount} Barang</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Belanja</p>
          <Price
            amount={order.total}
            currency={order.currency || 'IDR'}
            locale="id-ID"
            className="text-sm font-bold text-foreground"
          />
        </div>
        <div className="flex gap-2">
          {isPending && (
            <Button asChild size="sm">
              <Link href={`/order/confirmation/${order.id}`}>Bayar</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/account/orders/${order.id}`}>Detail</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: 'Menunggu Pembayaran',
    paid: 'Dibayar',
    packed: 'Dikemas',
    shipped: 'Dikirim',
    out_for_delivery: 'Dalam Pengiriman',
    delivered: 'Selesai',
    cancelled: 'Dibatalkan',
    failed: 'Gagal',
  };
  const key = status.toLowerCase();
  return labels[key] || status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (
    s.includes('paid') ||
    s.includes('shipped') ||
    s.includes('out_for_delivery') ||
    s.includes('delivered') ||
    s.includes('success')
  ) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  }
  if (s.includes('pending') || s.includes('wait')) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  }
  if (s.includes('cancel') || s.includes('fail')) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}
