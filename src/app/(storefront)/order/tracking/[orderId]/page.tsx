'use client';

import { MapPin, Truck } from 'lucide-react';
import type { Route } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { TrackingActions } from '@/components/tracking-actions';
import { Button } from '@/components/ui/button';
import { useShipment } from '@/entities/orders/api/hooks';
import { formatDateTime } from '@/lib/api/utils';
import { shipmentStatusLabel } from '@/shared/i18n/status';
import { abs } from '@/shared/seo/seo';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException } from '@/shared/telemetry/sentry';
import { EmptyState } from '@/shared/ui/EmptyState';
import { OrderTrackingSkeleton } from '@/shared/ui/skeletons/OrderTrackingSkeleton';

function TrackingMapLoading() {
  const t = useTranslations('account.tracking');
  return (
    <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
      {t('mapLoading')}
    </div>
  );
}

const TrackingMap = dynamic(() => import('@/components/tracking-map'), {
  ssr: false,
  loading: () => <TrackingMapLoading />,
});

export default function OrderTrackingPage() {
  const t = useTranslations('account.tracking');
  const tAccount = useTranslations('account');
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
        title={t('notFoundTitle')}
        description={t('notFoundDescription')}
        cta={{ label: t('backToOrder'), href: '/account/orders' }}
      />
    );
  }

  if (isLoading) {
    return <OrderTrackingSkeleton />;
  }

  if (error || !shipment) {
    return (
      <EmptyState
        title={t('loadFailedTitle')}
        description={t('loadFailedDescription')}
        cta={{ label: t('backToOrder'), href: `/account/orders/${orderId}` as Route }}
      />
    );
  }

  const statusLabel =
    shipment.statusLabel ||
    shipmentStatusLabel(tAccount, shipment.status) ||
    shipment.status.replace(/_/g, ' ');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t.rich('trackingNumber', {
            number: shipment.trackingNumber,
            strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('courier')}</p>
          <p className="text-base font-semibold">{shipment.courier}</p>
          <p className="text-xs text-muted-foreground">{shipment.service}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('currentStatus')}</p>
          <p className="text-base font-semibold">{statusLabel}</p>
          {shipment.estimatedDelivery ? (
            <p className="text-xs text-muted-foreground">
              {t('eta', { date: formatDateTime(shipment.estimatedDelivery) })}
            </p>
          ) : null}
        </div>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('history')}</h2>
          <Truck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <ol className="mt-4 space-y-4">
          {[...shipment.tracking]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((event, index, events) => {
              const label = shipmentStatusLabel(tAccount, event.status) ?? event.status;
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
          <h2 className="text-lg font-semibold">{t('map')}</h2>
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
          <Link href={`/account/orders/${orderId}`}>{t('backToOrder')}</Link>
        </Button>
        <Button asChild>
          <Link href="/account/orders">{t('viewAllOrders')}</Link>
        </Button>
      </div>
    </div>
  );
}
