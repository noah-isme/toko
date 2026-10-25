'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ConversionReport } from '@/components/admin/reports/conversion-report';
import { CustomersReport } from '@/components/admin/reports/customers-report';
import {
  ReportDateRangePicker,
  type ReportRangeValue,
} from '@/components/admin/reports/report-date-range';
import { ReportExportButton } from '@/components/admin/reports/report-export-button';
import { SalesByCategoryReport } from '@/components/admin/reports/sales-by-category-report';
import { SalesByProductReport } from '@/components/admin/reports/sales-by-product-report';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAdminConversionReport,
  useAdminCustomersReport,
  useAdminSalesByCategoryReport,
} from '@/entities/admin/hooks';
import { presetRange, reportRangeQuery, validateReportRange } from '@/entities/admin/report-range';
import type { AdminReportKind } from '@/entities/admin/types';

type ReportTab = 'category' | 'product' | 'conversion' | 'customers';

const TABS: { value: ReportTab; report: AdminReportKind }[] = [
  { value: 'category', report: 'sales-by-category' },
  { value: 'product', report: 'sales-by-product' },
  { value: 'conversion', report: 'conversion' },
  { value: 'customers', report: 'customers' },
];

export default function ReportsPage() {
  const t = useTranslations('admin.reports');
  const [range, setRange] = useState<ReportRangeValue>(() => ({
    preset: '30d',
    range: presetRange('30d'),
  }));
  const [tab, setTab] = useState<ReportTab>('category');
  const [category, setCategory] = useState<{ id: string; name: string } | null>(null);

  const valid = validateReportRange(range.range) === null;
  const query = valid ? reportRangeQuery(range.range) : null;
  const params = query ?? {};

  // The resolved timezone comes back with every report; read whichever is cached.
  const categoryReport = useAdminSalesByCategoryReport(params, { enabled: false });
  const conversionReport = useAdminConversionReport(params, { enabled: false });
  const customersReport = useAdminCustomersReport(params, { enabled: false });
  const timezone =
    categoryReport.data?.timezone ??
    conversionReport.data?.timezone ??
    customersReport.data?.timezone;

  const exportButton = (report: AdminReportKind, label: string) => (
    <ReportExportButton
      report={report}
      reportLabel={label}
      params={
        query && report === 'sales-by-product' && category
          ? { ...query, categoryId: category.id }
          : query
      }
    />
  );

  const selectCategory = (next: { id: string; name: string } | null) => {
    setCategory(next);
    if (next) setTab('product');
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <ReportDateRangePicker value={range} onChange={setRange} />
        {timezone ? (
          <p className="text-xs text-muted-foreground">{t('timezone', { timezone })}</p>
        ) : null}
      </div>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t('revenueNote')}</span>
      </p>

      <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)}>
        <div className="overflow-x-auto">
          <TabsList aria-label={t('tabsLabel')}>
            {TABS.map((entry) => (
              <TabsTrigger key={entry.value} value={entry.value}>
                {t(`tabs.${entry.value}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="category" className="mt-4">
          <SalesByCategoryReport
            params={params}
            enabled={valid && tab === 'category'}
            actions={exportButton('sales-by-category', t('tabs.category'))}
            onSelectCategory={selectCategory}
          />
        </TabsContent>
        <TabsContent value="product" className="mt-4">
          <SalesByProductReport
            key={`${query?.from}-${query?.to}-${category?.id ?? 'all'}`}
            params={params}
            enabled={valid && tab === 'product'}
            category={category}
            onCategoryChange={setCategory}
            actions={exportButton('sales-by-product', t('tabs.product'))}
          />
        </TabsContent>
        <TabsContent value="conversion" className="mt-4">
          <ConversionReport
            params={params}
            enabled={valid && tab === 'conversion'}
            actions={exportButton('conversion', t('tabs.conversion'))}
          />
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
          <CustomersReport
            params={params}
            enabled={valid && tab === 'customers'}
            actions={exportButton('customers', t('tabs.customers'))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
