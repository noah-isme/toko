'use client';

import Link from 'next/link';

import { useOrders } from '@/lib/api';
import { ORDER_STATUS_LABELS, formatCurrency, formatDate } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

interface RecentOrdersProps {
  limit?: number;
  className?: string;
}

export function RecentOrders({ limit = 5, className }: RecentOrdersProps) {
  const { data, isLoading, error } = useOrders(1, limit);

  if (isLoading) {
    return <RecentOrdersSkeleton />;
  }

  if (error || !data) {
    return null;
  }

  const orders = data.data || [];

  if (orders.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
        </div>
        <div className="rounded-lg border border-dashed border-muted-foreground/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">No orders yet</p>
          <Link
            href="/products"
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Orders</h2>
        {orders.length >= limit && (
          <Link href="/orders" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {orders.map((order) => {
          const statusInfo = ORDER_STATUS_LABELS[order.status];
          const statusLabel = statusInfo?.label || order.status;
          const statusColor = getStatusColor(order.status);

          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Order #{order.orderNumber}</p>
                    <span
                      className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColor)}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.itemCount || 0} {(order.itemCount || 0) === 1 ? 'item' : 'items'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(order.total)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RecentOrdersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BaseSkeleton className="h-6 w-32" />
        <BaseSkeleton className="h-4 w-20" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <BaseSkeleton className="h-5 w-32" />
                <BaseSkeleton className="h-4 w-20" />
                <BaseSkeleton className="h-3 w-24" />
              </div>
              <BaseSkeleton className="h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return colors[status] || 'bg-gray-100 text-gray-800';
}
