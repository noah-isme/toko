'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import { useOrdersQuery } from '@/entities/orders/api/hooks';

const PAGE_SIZE = 10;

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateFormatter.format(date);
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function statusClasses(status: string) {
  const normalized = status.toUpperCase();

  if (['PAID', 'COMPLETED', 'DELIVERED', 'FULFILLED'].includes(normalized)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(normalized)) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (['FAILED', 'EXPIRED', 'CANCELED', 'CANCELLED', 'REFUNDED'].includes(normalized)) {
    return 'border-destructive/40 bg-destructive/10 text-destructive';
  }

  return 'border-muted bg-muted/20 text-muted-foreground';
}

function StatusBadge({ label, value }: { label: string; value?: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-wide ${statusClasses(value)}`}
    >
      <span>{label}:</span>
      <span>{formatStatus(value)}</span>
    </span>
  );
}

export function OrdersTableSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[2fr_2fr_2fr_2fr_auto] items-center gap-3">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-6 w-40 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrdersPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pageParam = searchParams.get('page');
  const parsedPage = Number.parseInt(pageParam ?? '1', 10);
  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const ordersQuery = useOrdersQuery({ page: currentPage, limit: PAGE_SIZE });
  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;

  const totalPages = useMemo(() => {
    if (!meta) {
      return 1;
    }
    if (meta.totalPages && meta.totalPages > 0) {
      return meta.totalPages;
    }
    if (meta.total && meta.limit) {
      return Math.max(1, Math.ceil(meta.total / meta.limit));
    }
    return 1;
  }, [meta]);

  const handlePageChange = (page: number) => {
    const nextPage = Math.max(1, Math.min(page, totalPages));
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage === 1) {
      params.delete('page');
    } else {
      params.set('page', String(nextPage));
    }
    const query = params.toString();
    router.push(query ? `/orders?${query}` : '/orders');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Pesanan Saya</h1>
          <p className="text-sm text-muted-foreground">Pantau riwayat dan status pesanan Anda.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/products">Belanja lagi</Link>
        </Button>
      </div>

      {ordersQuery.isLoading ? (
        <OrdersTableSkeleton />
      ) : ordersQuery.isError ? (
        <EmptyState
          title="Tidak dapat memuat pesanan"
          description={ordersQuery.error?.error?.message ?? 'Coba muat ulang beberapa saat lagi.'}
          action={{
            label: 'Coba lagi',
            onClick: () => {
              void ordersQuery.refetch();
            },
          }}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Belum ada pesanan"
          description="Setelah Anda menyelesaikan transaksi, pesanan akan muncul di sini."
          action={{
            label: 'Mulai belanja',
            onClick: () => router.push('/products'),
          }}
        />
      ) : (
        <div className="space-y-4 rounded-lg border p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-muted-foreground">
                  <th className="pb-3 font-medium">Tanggal</th>
                  <th className="pb-3 font-medium">Nomor</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => (
                  <tr key={order.id} className="align-top">
                    <td className="py-3 text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-3 font-medium">
                      <Link href={`/orders/${order.id}`} className="text-primary hover:underline">
                        {order.number}
                      </Link>
                    </td>
                    <td className="py-3">
                      <Price
                        amount={order.total.amount}
                        currency={order.total.currency}
                        locale="id-ID"
                        className="font-semibold text-foreground"
                      />
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge label="Pembayaran" value={order.paymentStatus} />
                        <StatusBadge label="Pengiriman" value={order.fulfillmentStatus} />
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <Button asChild variant="link" size="sm">
                        <Link href={`/orders/${order.id}`}>Lihat detail</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <p>
              Halaman {currentPage} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || ordersQuery.isFetching}
              >
                Sebelumnya
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || ordersQuery.isFetching}
              >
                Berikutnya
              </Button>
            </div>
          </div>
          {ordersQuery.isFetching ? (
            <p className="text-xs text-muted-foreground">Memuat data terbaru…</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
