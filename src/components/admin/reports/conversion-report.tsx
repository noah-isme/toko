'use client';

import { useTranslations } from 'next-intl';

import { InlineBar, ReportSection, StatTile, useReportFormat } from './report-parts';

import { AdminEmpty, AdminError, AdminLoading } from '@/components/admin/admin-ui';
import { useAdminConversionReport } from '@/entities/admin/hooks';
import type { AdminReportRangeParams } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';

/**
 * Carts -> checkouts -> paid orders. Each step is a labelled bar scaled to the
 * largest step (a step can exceed the previous one: one cart can be checked
 * out several times), with the step-over-step rate in text.
 */
export function ConversionReport({
  params,
  enabled,
  actions,
}: {
  params: AdminReportRangeParams;
  enabled: boolean;
  actions?: React.ReactNode;
}) {
  const t = useTranslations('admin.reports.conversion');
  const tReports = useTranslations('admin.reports');
  const { currency } = useAdminFormat();
  const { percent, count } = useReportFormat();
  const report = useAdminConversionReport(params, { enabled });
  const data = report.data;

  if (!enabled) return null;
  if (report.isLoading) return <AdminLoading label={tReports('loading')} />;
  if (report.isError) {
    return <AdminError error={report.error} onRetry={() => void report.refetch()} />;
  }
  if (!data) return null;

  const steps = [
    { key: 'carts', label: t('carts'), value: data.cartsCreated, rate: null },
    {
      key: 'checkouts',
      label: t('checkouts'),
      value: data.checkoutsStarted,
      rate: data.checkoutRate,
    },
    { key: 'paid', label: t('paid'), value: data.paidOrders, rate: data.paymentRate },
  ];
  const stepMax = Math.max(0, ...steps.map((step) => step.value));
  const outcomes = [
    { key: 'paid', label: t('paid'), value: data.paidOrders },
    { key: 'pending', label: t('pending'), value: data.pendingOrders },
    { key: 'cancelled', label: t('cancelled'), value: data.cancelledOrders },
    { key: 'refunded', label: t('refunded'), value: data.refundedOrders },
  ];
  const isEmpty = data.cartsCreated === 0 && data.checkoutsStarted === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label={t('checkoutRate')} value={percent(data.checkoutRate)} />
        <StatTile label={t('paymentRate')} value={percent(data.paymentRate)} />
        <StatTile label={t('conversionRate')} value={percent(data.conversionRate)} />
        <StatTile label={t('paidRevenue')} value={currency(data.paidRevenue)} />
        <StatTile label={t('refundedAmount')} value={currency(data.refundedAmount)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportSection title={t('funnelTitle')} actions={actions}>
          {isEmpty ? (
            <AdminEmpty message={t('empty')} />
          ) : (
            <div className="space-y-4">
              <ol className="space-y-4" data-testid="conversion-funnel">
                {steps.map((step) => (
                  <li key={step.key} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="font-medium">{step.label}</span>
                      <span className="font-mono font-medium">{count(step.value)}</span>
                    </div>
                    <InlineBar value={step.value} max={stepMax} />
                    {step.rate !== null ? (
                      <p className="text-xs text-muted-foreground">
                        {t('stepRate', { rate: percent(step.rate) })}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground">{t('rateNote')}</p>
            </div>
          )}
        </ReportSection>

        <ReportSection title={t('outcomesTitle')}>
          {data.checkoutsStarted === 0 ? (
            <AdminEmpty message={t('empty')} />
          ) : (
            <dl className="space-y-4">
              {outcomes.map((outcome) => (
                <div key={outcome.key} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <dt>{outcome.label}</dt>
                    <dd className="font-mono font-medium">
                      {count(outcome.value)}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({percent(outcome.value / data.checkoutsStarted)})
                      </span>
                    </dd>
                  </div>
                  <InlineBar value={outcome.value} max={data.checkoutsStarted} />
                </div>
              ))}
            </dl>
          )}
        </ReportSection>
      </div>
    </div>
  );
}
