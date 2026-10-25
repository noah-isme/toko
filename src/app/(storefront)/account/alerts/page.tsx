'use client';

import { BellRing, TrendingDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import {
  useDeleteAlertMutation,
  useMyAlertsQuery,
  useSubscribeAlertMutation,
} from '@/entities/alerts/hooks';
import { isTargetSellable } from '@/entities/alerts/sellable';
import type { AlertSubscription } from '@/entities/alerts/types';
import { alertErrorKind } from '@/entities/alerts/ui/messages';
import { cn } from '@/lib/utils';
import { useFormat } from '@/shared/i18n/use-format';
import { EmptyState } from '@/shared/ui/EmptyState';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';
import { useToast } from '@/shared/ui/toast';

const PAGE_SIZE = 20;

export default function AlertsPage() {
  const t = useTranslations('account.alerts');
  const tAlerts = useTranslations('product.alerts');
  const tCrumb = useTranslations('account.breadcrumb');
  const fmt = useFormat();
  const { toast } = useToast();
  const headingId = useId();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch, isFetching } = useMyAlertsQuery({
    page,
    limit: PAGE_SIZE,
  });
  const remove = useDeleteAlertMutation();
  const rearm = useSubscribeAlertMutation();

  const alerts = data?.data ?? [];
  const totalItems = data?.pagination.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const busyId = remove.isPending
    ? remove.variables
    : rearm.isPending
      ? alerts.find(
          (a) =>
            a.productId === rearm.variables?.productId &&
            a.type === rearm.variables?.type &&
            a.variantId === (rearm.variables?.variantId ?? null),
        )?.id
      : undefined;

  const onError = (err: unknown) =>
    toast({ variant: 'destructive', description: tAlerts(`errors.${alertErrorKind(err)}`) });

  const handleRemove = (alert: AlertSubscription) => {
    remove.mutate(alert.id, {
      onSuccess: () => {
        toast({ variant: 'success', description: t('removed') });
        // Step back when the last row of a later page was removed.
        if (alerts.length === 1 && page > 1) setPage((p) => p - 1);
      },
      onError,
    });
  };

  const handleRearm = (alert: AlertSubscription) => {
    rearm.mutate(
      { productId: alert.productId, variantId: alert.variantId, type: alert.type },
      {
        onSuccess: () => toast({ variant: 'success', description: t('rearmed') }),
        onError,
      },
    );
  };

  const header = (
    <>
      <Breadcrumbs
        items={[
          { label: tCrumb('home'), href: '/' },
          { label: tCrumb('account'), href: '/account' },
          { label: tCrumb('alerts') },
        ]}
      />
      <div>
        <h1 id={headingId} className="text-2xl font-bold">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
    </>
  );

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        {header}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 rounded-lg border p-4">
              <BaseSkeleton className="h-16 w-16" />
              <div className="flex-1 space-y-2">
                <BaseSkeleton className="h-5 w-1/3" />
                <BaseSkeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div role="alert" className="rounded-lg border border-destructive/40 p-6 text-center">
          <p className="text-destructive">{t('loadFailed')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<BellRing aria-hidden="true" />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          cta={{ label: t('browse'), href: '/products' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <ul className="grid gap-3" aria-labelledby={headingId}>
        {alerts.map((alert) => {
          const productName = alert.product.title;
          const sellable = isTargetSellable(alert.product, alert.variant);
          const canRearm =
            alert.status === 'notified' && (alert.type === 'PRICE_DROP' || !sellable);
          const isBusy = busyId === alert.id;
          const Icon = alert.type === 'PRICE_DROP' ? TrendingDown : BellRing;
          return (
            <li
              key={alert.id}
              className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center"
              aria-busy={isBusy || undefined}
            >
              {alert.product.thumbnail ? (
                <Image
                  src={alert.product.thumbnail}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-md object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-md bg-muted" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(`types.${alert.type}`)}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      alert.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {alert.status === 'active'
                      ? t('status.active')
                      : t('status.notified', { date: fmt.dateTime(alert.notifiedAt ?? '') })}
                  </span>
                </div>
                <Link
                  href={`/products/${alert.product.slug}`}
                  className="block truncate font-medium hover:underline"
                >
                  {productName}
                </Link>
                {alert.variant?.sku ? (
                  <p className="text-xs text-muted-foreground">
                    {t('variant', { sku: alert.variant.sku })}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {alert.type === 'PRICE_DROP' && alert.priceAtSubscribe !== null
                    ? t('prices', {
                        then: fmt.currency(alert.priceAtSubscribe, 'IDR'),
                        now: fmt.currency(alert.variant?.price ?? alert.product.price, 'IDR'),
                      })
                    : sellable
                      ? t('availableNow')
                      : t('stillSoldOut')}
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {t('createdAt', { date: fmt.dateTime(alert.createdAt) })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                {canRearm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRearm(alert)}
                    disabled={isBusy}
                    aria-label={t('rearmLabel', { product: productName })}
                  >
                    {t('rearm')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(alert)}
                  disabled={isBusy}
                  aria-label={t('removeLabel', { product: productName })}
                >
                  {t('remove')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4" aria-label={t('pagination')}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            {t('previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('pageOf', { page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            {t('next')}
          </Button>
        </nav>
      )}
    </div>
  );
}
