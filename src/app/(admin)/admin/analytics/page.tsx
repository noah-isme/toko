'use client';

import { DollarSign, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { orderStatusLabel } from '@/entities/admin/format';
import { useAdminAnalyticsOverview } from '@/entities/admin/hooks';
import type { AdminAnalyticsRange, AdminOrderStatus } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';

const RANGE_OPTIONS: AdminAnalyticsRange[] = ['7d', '30d', '90d', 'all'];

/** Statuses the overview endpoint counts, in fulfilment order. */
const FUNNEL: {
  status: AdminOrderStatus;
  key: 'pendingOrders' | 'paidOrders' | 'shippedOrders' | 'deliveredOrders' | 'cancelledOrders';
  className: string;
}[] = [
  { status: 'PENDING_PAYMENT', key: 'pendingOrders', className: 'bg-yellow-500' },
  { status: 'PAID', key: 'paidOrders', className: 'bg-green-500' },
  { status: 'SHIPPED', key: 'shippedOrders', className: 'bg-purple-500' },
  { status: 'DELIVERED', key: 'deliveredOrders', className: 'bg-emerald-500' },
  { status: 'CANCELLED', key: 'cancelledOrders', className: 'bg-red-500' },
];

export default function AnalyticsPage() {
  const t = useTranslations('admin.analytics');
  const tAdmin = useTranslations('admin');
  const { currency } = useAdminFormat();
  const [range, setRange] = useState<AdminAnalyticsRange>('30d');
  const overview = useAdminAnalyticsOverview(range);
  const data = overview.data;

  const summary = [
    { label: t('summary.revenue'), value: currency(data?.totalRevenue ?? 0), icon: DollarSign },
    { label: t('summary.orders'), value: String(data?.totalOrders ?? 0), icon: ShoppingCart },
    {
      label: t('summary.averageOrderValue'),
      value: currency(data?.averageOrderValue ?? 0),
      icon: TrendingUp,
    },
    { label: t('summary.customers'), value: String(data?.totalCustomers ?? 0), icon: Users },
    { label: t('summary.products'), value: String(data?.totalProducts ?? 0), icon: Package },
  ];

  // Scale bars against the busiest status so small buckets stay visible.
  const funnelMax = data ? Math.max(1, ...FUNNEL.map((entry) => data[entry.key])) : 1;
  const topRevenueMax = data
    ? Math.max(1, ...data.topProducts.map((product) => product.revenue))
    : 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Select value={range} onValueChange={(value) => setRange(value as AdminAnalyticsRange)}>
            <SelectTrigger className="w-[160px]" aria-label={t('dateRange')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {tAdmin(`ranges.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {overview.isLoading ? (
        <AdminLoading label={t('loading')} />
      ) : overview.isError ? (
        <AdminError error={overview.error} onRetry={() => void overview.refetch()} />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {summary.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('ordersByStatus')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {FUNNEL.map((entry) => {
                  const count = data[entry.key];
                  return (
                    <div key={entry.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{orderStatusLabel(tAdmin, entry.status)}</span>
                        <span className="font-mono font-medium">{count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full ${entry.className}`}
                          style={{ width: `${(count / funnelMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('revenueShare')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.topProducts.length === 0 ? (
                  <AdminEmpty message={t('noSales')} />
                ) : (
                  data.topProducts.slice(0, 8).map((product) => (
                    <div key={product.productId} className="space-y-1">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="truncate">{product.title}</span>
                        <span className="whitespace-nowrap font-mono font-medium">
                          {currency(product.revenue)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${(product.revenue / topRevenueMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('topProducts')}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topProducts.length === 0 ? (
                <AdminEmpty message={t('noSales')} />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>{t('columns.product')}</TableHead>
                        <TableHead className="text-right">{t('columns.unitsSold')}</TableHead>
                        <TableHead className="text-right">{t('columns.revenue')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topProducts.map((product, index) => (
                        <TableRow key={product.productId}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium">{product.title}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {product.slug}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {product.unitsSold}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {currency(product.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
