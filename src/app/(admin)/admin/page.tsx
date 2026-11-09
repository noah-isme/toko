'use client';

import { AlertTriangle, DollarSign, Package, PackageX, ShoppingCart, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  OrderStatusBadge,
} from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminAnalyticsOverview, useAdminOrders } from '@/entities/admin/hooks';
import type { AdminAnalyticsRange } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';

const RANGE_OPTIONS: AdminAnalyticsRange[] = ['7d', '30d', '90d', 'all'];

export default function AdminDashboard() {
  const t = useTranslations('admin.dashboard');
  const tRanges = useTranslations('admin.ranges');
  const tCommon = useTranslations('admin.common');
  const { currency, date } = useAdminFormat();
  const [range, setRange] = useState<AdminAnalyticsRange>('30d');
  const overview = useAdminAnalyticsOverview(range);
  const recentOrders = useAdminOrders({ page: 1, limit: 5 });

  if (overview.isLoading) {
    return <AdminLoading label={t('loading')} />;
  }

  if (overview.isError) {
    return <AdminError error={overview.error} onRetry={() => void overview.refetch()} />;
  }

  const data = overview.data;
  const stats: { label: string; value: string; icon: typeof DollarSign; hint?: string }[] = [
    {
      label: t('stats.revenue'),
      value: currency(data?.totalRevenue ?? 0),
      icon: DollarSign,
      hint: t('stats.revenueBasis'),
    },
    { label: t('stats.orders'), value: String(data?.totalOrders ?? 0), icon: ShoppingCart },
    { label: t('stats.products'), value: String(data?.totalProducts ?? 0), icon: Package },
    { label: t('stats.customers'), value: String(data?.totalCustomers ?? 0), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <Select value={range} onValueChange={(value) => setRange(value as AdminAnalyticsRange)}>
              <SelectTrigger className="w-[160px]" aria-label={t('dateRange')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {tRanges(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/admin/orders">{t('viewAllOrders')}</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.hint ? (
                  <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.averageOrderValue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {currency(Math.round(data?.averageOrderValue ?? 0))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('stats.averageOrderValueBasis', { count: data?.revenueOrders ?? 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.pending')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.pendingOrders ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.shipped')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.shippedOrders ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.delivered')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.deliveredOrders ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2" data-testid="dashboard-stock-cards">
        {(
          [
            {
              key: 'low',
              label: t('stats.lowStock'),
              link: t('stats.lowStockLink'),
              value: data?.lowStockProducts,
              icon: AlertTriangle,
              tone: 'text-amber-600',
            },
            {
              key: 'out',
              label: t('stats.outOfStock'),
              link: t('stats.outOfStockLink'),
              value: data?.outOfStockProducts,
              icon: PackageX,
              tone: 'text-destructive',
            },
          ] as const
        ).map(({ key, label, link, value, icon: Icon, tone }) => (
          <Link
            key={key}
            href={`/admin/inventory?stockStatus=${key}` as never}
            className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${label}: ${t('stats.productsCount', { count: value ?? 0 })}. ${link}`}
            data-testid={`dashboard-stock-${key}`}
          >
            <Card className="h-full transition-colors group-hover:bg-muted/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold">{value ?? 0}</div>
                <p className="text-xs text-muted-foreground group-hover:underline">{link}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('recentOrders')}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.isLoading ? (
              <AdminLoading label={t('loadingOrders')} />
            ) : recentOrders.isError ? (
              <AdminError error={recentOrders.error} onRetry={() => void recentOrders.refetch()} />
            ) : (recentOrders.data?.data.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('noOrders')}</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.data?.data.map((order) => (
                  <div key={order.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.customerName ?? order.customerEmail ?? tCommon('guest')}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.orderNumber ?? order.id.slice(0, 8)} · {date(order.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      <p className="text-sm font-medium">{currency(order.total, order.currency)}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('topProducts')}</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.topProducts.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('noSales')}</p>
            ) : (
              <div className="space-y-4">
                {data?.topProducts.map((product, index) => (
                  <div key={product.productId} className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 text-sm font-medium text-muted-foreground">
                        {index + 1}.
                      </span>
                      <p className="truncate text-sm font-medium">{product.title}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">
                        {t('unitsSold', { count: product.unitsSold })}
                      </p>
                      <p className="text-xs text-muted-foreground">{currency(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
