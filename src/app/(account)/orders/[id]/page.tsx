'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import { useOrderQuery } from '@/entities/orders/api/hooks';
import type { OrderAddress, OrderItem } from '@/entities/orders/schemas';

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'long',
  timeStyle: 'short',
});

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateTimeFormatter.format(date);
}

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
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

function AddressBlock({ title, address }: { title: string; address?: OrderAddress | null }) {
  if (!address) {
    return null;
  }

  const lines = [
    address.fullName,
    [address.phone, address.detail].filter(Boolean).join(' • ').trim(),
    address.district ? `${address.district}, ${address.city}` : address.city,
    `${address.province} ${address.postalCode}`.trim(),
    address.country,
  ].filter((line) => Boolean(line && line.length > 0));

  return (
    <div className="space-y-1 text-sm">
      <h3 className="font-medium text-foreground">{title}</h3>
      {lines.map((line) => (
        <p key={line} className="text-muted-foreground">
          {line}
        </p>
      ))}
    </div>
  );
}

function ItemsTable({ items }: { items: OrderItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Tidak ada item pada pesanan ini.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-muted-foreground">
            <th className="pb-3 font-medium">Produk</th>
            <th className="pb-3 font-medium">Jumlah</th>
            <th className="pb-3 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="py-3">
                <div className="flex gap-3">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-16 w-16 rounded-md border object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.variant ? (
                      <p className="text-xs text-muted-foreground">Varian: {item.variant}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Harga satuan:{' '}
                      <Price
                        amount={item.price.amount}
                        currency={item.price.currency}
                        locale="id-ID"
                        className="font-normal text-muted-foreground"
                      />
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-3 text-sm text-muted-foreground">x{item.quantity}</td>
              <td className="py-3 text-right">
                <Price
                  amount={item.total.amount}
                  currency={item.total.currency}
                  locale="id-ID"
                  className="font-semibold text-foreground"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalsList({
  subtotal,
  shipping,
  discount,
  tax,
  total,
  currency,
}: {
  subtotal: number;
  shipping?: number | null;
  discount?: number | null;
  tax?: number | null;
  total: number;
  currency: string;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <Price amount={subtotal} currency={currency} locale="id-ID" className="text-foreground" />
      </div>
      {typeof discount === 'number' && discount > 0 ? (
        <div className="flex items-center justify-between text-destructive">
          <span>Diskon</span>
          <Price
            amount={-discount}
            currency={currency}
            locale="id-ID"
            className="text-destructive"
          />
        </div>
      ) : null}
      {typeof shipping === 'number' ? (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pengiriman</span>
          <Price amount={shipping} currency={currency} locale="id-ID" className="text-foreground" />
        </div>
      ) : null}
      {typeof tax === 'number' ? (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pajak</span>
          <Price amount={tax} currency={currency} locale="id-ID" className="text-foreground" />
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
        <span>Total Dibayar</span>
        <Price amount={total} currency={currency} locale="id-ID" className="text-foreground" />
      </div>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="h-44 animate-pulse rounded-lg border bg-muted" />
          <div className="h-64 animate-pulse rounded-lg border bg-muted" />
        </div>
        <div className="h-40 animate-pulse rounded-lg border bg-muted" />
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const orderQuery = useOrderQuery(id);

  const currency = orderQuery.data?.totals.total.currency ?? 'IDR';
  const totals = useMemo(() => {
    if (!orderQuery.data) {
      return null;
    }
    return {
      subtotal: orderQuery.data.totals.subtotal.amount,
      shipping: orderQuery.data.totals.shipping?.amount ?? null,
      discount: orderQuery.data.totals.discount?.amount ?? null,
      tax: orderQuery.data.totals.tax?.amount ?? null,
      total: orderQuery.data.totals.total.amount,
    };
  }, [orderQuery.data]);

  const statusHistory = useMemo(() => {
    const history = orderQuery.data?.statusHistory;
    if (!history || history.length === 0) {
      return [] as NonNullable<typeof history>;
    }
    return [...history].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [orderQuery.data?.statusHistory]);

  if (orderQuery.isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (orderQuery.isError) {
    return (
      <EmptyState
        title="Tidak dapat memuat detail pesanan"
        description={orderQuery.error?.error?.message ?? 'Silakan coba lagi dalam beberapa saat.'}
        action={{
          label: 'Muat ulang',
          onClick: () => {
            void orderQuery.refetch();
          },
        }}
      />
    );
  }

  const order = orderQuery.data;

  if (!order) {
    return (
      <EmptyState
        title="Pesanan tidak ditemukan"
        description="Pesanan ini mungkin sudah dihapus atau Anda tidak memiliki akses."
        action={{
          label: 'Kembali ke pesanan',
          onClick: () => {
            router.push('/orders');
          },
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold">Detail Pesanan</h1>
          <p className="text-sm text-muted-foreground">
            Nomor pesanan {order.number} • dibuat pada {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/orders">Kembali ke daftar</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-lg border p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status saat ini</p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label="Pembayaran" value={order.paymentStatus} />
                  <StatusBadge label="Pengiriman" value={order.fulfillmentStatus} />
                </div>
              </div>
              {statusHistory.length ? (
                <p className="text-xs text-muted-foreground">
                  Pembaruan terakhir {formatDateTime(statusHistory[0]?.at ?? order.createdAt)}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <AddressBlock title="Alamat Pengiriman" address={order.shippingAddress} />
              <AddressBlock title="Alamat Penagihan" address={order.billingAddress} />
            </div>
            {order.shippingMethod ? (
              <div className="text-sm">
                <h3 className="font-medium text-foreground">Metode Pengiriman</h3>
                <p className="text-muted-foreground">
                  {order.shippingMethod.label}{' '}
                  {order.shippingMethod.trackingNumber
                    ? `(Resi: ${order.shippingMethod.trackingNumber})`
                    : null}
                </p>
                {order.shippingMethod.cost ? (
                  <p className="text-xs text-muted-foreground">
                    Biaya pengiriman:{' '}
                    <Price
                      amount={order.shippingMethod.cost.amount}
                      currency={order.shippingMethod.cost.currency}
                      locale="id-ID"
                      className="font-normal text-muted-foreground"
                    />
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="space-y-4 rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Item Pesanan</h2>
              <span className="text-sm text-muted-foreground">{order.items.length} item</span>
            </div>
            <ItemsTable items={order.items} />
          </section>

          {statusHistory.length ? (
            <section className="space-y-3 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Riwayat Status</h2>
              <ol className="space-y-2 text-sm">
                {statusHistory.map((entry) => (
                  <li
                    key={`${entry.status}-${entry.at}`}
                    className="flex flex-col justify-between gap-1 rounded-md border border-dashed p-3 sm:flex-row sm:items-center"
                  >
                    <span className="font-medium text-foreground">
                      {formatStatus(entry.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.at)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {order.notes ? (
            <section className="space-y-2 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Catatan Pesanan</h2>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{order.notes}</p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="space-y-4 rounded-lg border p-6">
            <div>
              <h2 className="text-lg font-semibold">Ringkasan Pembayaran</h2>
              <p className="text-sm text-muted-foreground">Detail total biaya pesanan Anda.</p>
            </div>
            {totals ? (
              <TotalsList
                subtotal={totals.subtotal}
                shipping={totals.shipping}
                discount={totals.discount}
                tax={totals.tax}
                total={totals.total}
                currency={currency}
              />
            ) : null}
          </section>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/products">Belanja lagi</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
