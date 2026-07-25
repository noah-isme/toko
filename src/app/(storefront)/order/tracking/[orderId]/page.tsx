'use client';

import { MapPin, Truck } from 'lucide-react';
import type { Route } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

import { TrackingActions } from '@/components/tracking-actions';
import { Button } from '@/components/ui/button';
import { useShipment } from '@/lib/api';
import { SHIPMENT_STATUS_LABELS } from '@/lib/api/constants';
import { formatDateTime } from '@/lib/api/utils';
import { abs } from '@/shared/seo/seo';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException } from '@/shared/telemetry/sentry';
import { EmptyState } from '@/shared/ui/EmptyState';
import { OrderTrackingSkeleton } from '@/shared/ui/skeletons/OrderTrackingSkeleton';

const TrackingMap = dynamic(() => import('@/components/tracking-map'), {
  ssr: false,
  loading: () => (
    <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
      Memuat peta...
    </div>
  ),
});

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';

  const { data: shipment, isLoading, error } = useShipment(orderId);

  useEffect(() => {
    if (error) {
      capturePosthogEvent('shipment_tracking_load_failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      captureSentryException(error);
    }
  }, [error, orderId]);

  if (!orderId) {
    return (
      <EmptyState
        title="Tracking tidak ditemukan"
        description="Order ID tidak tersedia. Periksa kembali tautan Anda."
        cta={{ label: 'Kembali ke pesanan', href: '/account/orders' }}
      />
    );
  }

  if (isLoading) {
    return <OrderTrackingSkeleton />;
  }

  if (error || !shipment) {
    return (
      <EmptyState
        title="Gagal memuat tracking"
        description="Kami belum bisa mengambil informasi pengiriman. Coba lagi nanti."
        cta={{ label: 'Kembali ke pesanan', href: `/account/orders/${orderId}` as Route }}
      />
    );
  }

  const statusLabel =
    shipment.statusLabel ||
    SHIPMENT_STATUS_LABELS[shipment.status]?.label ||
    shipment.status.replace(/_/g, ' ');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Lacak Pengiriman</h1>
        <p className="text-sm text-muted-foreground">
          Nomor resi <span className="font-medium text-foreground">{shipment.trackingNumber}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Kurir</p>
          <p className="text-base font-semibold">{shipment.courier}</p>
          <p className="text-xs text-muted-foreground">{shipment.service}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Status terkini</p>
          <p className="text-base font-semibold">{statusLabel}</p>
          {shipment.estimatedDelivery ? (
            <p className="text-xs text-muted-foreground">
              Estimasi tiba {formatDateTime(shipment.estimatedDelivery)}
            </p>
          ) : null}
        </div>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Riwayat pengiriman</h2>
          <Truck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <ol className="mt-4 space-y-4">
          {[...shipment.tracking]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((event, index, events) => {
              const label = SHIPMENT_STATUS_LABELS[event.status]?.label ?? event.status;
              const isLast = index === events.length - 1;
              return (
                <li key={`${event.timestamp}-${event.status}`} className="relative pl-6">
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
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.location} - {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                </li>
              );
            })}
        </ol>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Peta pengiriman</h2>
          <MapPin className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <TrackingMap tracking={shipment.tracking} />
      </section>

      <TrackingActions
        orderId={orderId}
        trackingNumber={shipment.trackingNumber}
        shareUrl={abs(`/order/tracking/${orderId}`)}
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/account/orders/${orderId}`}>Kembali ke pesanan</Link>
        </Button>
        <Button asChild>
          <Link href="/account/orders">Lihat semua pesanan</Link>
        </Button>
      </div>
    </div>
  );
}
