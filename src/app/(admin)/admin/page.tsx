'use client';

import { DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import Link from 'next/link';
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
import { useAdminAnalyticsOverview, useAdminOrders } from '@/lib/api/hooks.admin';
import { formatCurrency, formatDate, type AdminAnalyticsRange } from '@/lib/api/services/admin';

const RANGE_OPTIONS: { value: AdminAnalyticsRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export default function AdminDashboard() {
  const [range, setRange] = useState<AdminAnalyticsRange>('30d');
  const overview = useAdminAnalyticsOverview(range);
  const recentOrders = useAdminOrders({ page: 1, limit: 5 });

  if (overview.isLoading) {
    return <AdminLoading label="Loading dashboard..." />;
  }

  if (overview.isError) {
    return <AdminError error={overview.error} onRetry={() => void overview.refetch()} />;
  }

  const data = overview.data;
  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(data?.totalRevenue ?? 0),
      icon: DollarSign,
    },
    { label: 'Orders', value: String(data?.totalOrders ?? 0), icon: ShoppingCart },
    { label: 'Products', value: String(data?.totalProducts ?? 0), icon: Package },
    { label: 'Customers', value: String(data?.totalCustomers ?? 0), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Overview of your store performance"
        actions={
          <>
            <Select value={range} onValueChange={(value) => setRange(value as AdminAnalyticsRange)}>
              <SelectTrigger className="w-[160px]" aria-label="Date range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/admin/orders">View All Orders</Link>
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Order Value
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(Math.round(data?.averageOrderValue ?? 0))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.pendingOrders ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Shipped</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.shippedOrders ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.deliveredOrders ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.isLoading ? (
              <AdminLoading label="Loading orders..." />
            ) : recentOrders.isError ? (
              <AdminError error={recentOrders.error} onRetry={() => void recentOrders.refetch()} />
            ) : (recentOrders.data?.data.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.data?.data.map((order) => (
                  <div key={order.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.customerName ?? order.customerEmail ?? 'Guest'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.orderNumber ?? order.id.slice(0, 8)} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(order.total, order.currency)}
                      </p>
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
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.topProducts.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No sales in this period.
              </p>
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
                      <p className="text-sm font-medium">{product.unitsSold} sold</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(product.revenue)}
                      </p>
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
