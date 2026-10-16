'use client';

import { Eye, Package, Search, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  OrderStatusBadge,
} from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ADMIN_ORDER_STATUSES, orderStatusLabel } from '@/entities/admin/format';
import {
  useAdminOrder,
  useAdminOrders,
  useAdminOrderStats,
  useCreateAdminShipment,
  useUpdateAdminOrderStatus,
} from '@/entities/admin/hooks';
import type { AdminOrder, AdminOrderStatus } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const PAGE_SIZE = 20;

const COURIERS = ['JNE', 'J&T', 'SiCepat', 'AnterAja', 'POS'];

/**
 * Statuses an admin may set directly, mirroring `isAllowedAdminTarget` in
 * toko-api. PENDING_PAYMENT and PAID are driven by the payment flow instead.
 */
const SETTABLE_STATUSES: AdminOrderStatus[] = [
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

/** Rank table copied from the backend so the UI hides invalid transitions. */
const STATUS_RANK: Record<AdminOrderStatus, number> = {
  PENDING_PAYMENT: 0,
  PAID: 1,
  PACKED: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  CANCELLED: -1,
};

function allowedTargets(current: AdminOrderStatus): AdminOrderStatus[] {
  if (current === 'CANCELLED' || current === 'DELIVERED') return [];
  return SETTABLE_STATUSES.filter((target) => {
    if (target === 'CANCELLED') {
      // The SQL guard only allows cancelling from PENDING_PAYMENT or PAID.
      return current === 'PENDING_PAYMENT' || current === 'PAID';
    }
    return STATUS_RANK[target] === STATUS_RANK[current] + 1;
  });
}

function canCreateShipment(status: AdminOrderStatus): boolean {
  return status === 'PAID' || status === 'PACKED';
}

/** Colours the payment badge from the `payment_status` enum in toko-api. */
function paymentStatusClass(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'FAILED':
    case 'EXPIRED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function OrdersPage() {
  const t = useTranslations('admin.orders');
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('admin.common');
  const { currency, date } = useAdminFormat();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const { toast } = useToast();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [shipmentTarget, setShipmentTarget] = useState<AdminOrder | null>(null);
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const query = useAdminOrders({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const stats = useAdminOrderStats();
  const detail = useAdminOrder(detailId ?? undefined);
  const updateStatus = useUpdateAdminOrderStatus();
  const createShipment = useCreateAdminShipment();

  const orders = query.data?.data ?? [];

  const paymentStatusLabel = (status: string) => {
    const key = `payment.${status || 'none'}` as const;
    return t.has(key as never) ? t(key as never) : status;
  };
  const totalItems = query.data?.pagination.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const handleStatusChange = async (order: AdminOrder, status: AdminOrderStatus) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, status });
      toast({
        title: t('toast.statusUpdated'),
        description: t('toast.statusChange', {
          order: order.orderNumber ?? order.id.slice(0, 8),
          status: orderStatusLabel(tAdmin, status),
        }),
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: t('toast.statusFailed'),
        description: error instanceof Error ? error.message : t('toast.transitionNotAllowed'),
        variant: 'destructive',
      });
    }
  };

  const handleShipment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shipmentTarget) return;
    if (!courier || !trackingNumber.trim()) {
      toast({ title: t('toast.shipmentRequired'), variant: 'destructive' });
      return;
    }
    try {
      await createShipment.mutateAsync({
        orderId: shipmentTarget.id,
        courier,
        trackingNumber: trackingNumber.trim(),
      });
      toast({ title: t('toast.shipmentCreated'), variant: 'success' });
      setShipmentTarget(null);
      setCourier('');
      setTrackingNumber('');
    } catch (error) {
      toast({
        title: t('toast.shipmentFailed'),
        description: error instanceof Error ? error.message : tCommon('unknownError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} />

      {stats.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.total')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.totalOrders}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.revenue')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {currency(stats.data.totalRevenue)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.pending')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.pendingOrders}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.averageOrderValue')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {currency(Math.round(stats.data.averageOrderValue))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {t('all')}
              {totalItems > 0 ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({totalItems})
                </span>
              ) : null}
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 sm:w-64"
                  aria-label={t('searchLabel')}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as AdminOrderStatus | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44" aria-label={t('filterLabel')}>
                  <SelectValue placeholder={t('allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  {ADMIN_ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {orderStatusLabel(tAdmin, status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <AdminLoading label={t('loading')} />
          ) : query.isError ? (
            <AdminError error={query.error} onRetry={() => void query.refetch()} />
          ) : orders.length === 0 ? (
            <AdminEmpty message={t('empty')} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('columns.order')}</TableHead>
                      <TableHead>{t('columns.customer')}</TableHead>
                      <TableHead className="text-right">{t('columns.total')}</TableHead>
                      <TableHead>{t('columns.payment')}</TableHead>
                      <TableHead>{tCommon('status')}</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        {t('columns.tracking')}
                      </TableHead>
                      <TableHead className="text-right">{tCommon('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const targets = allowedTargets(order.status);
                      return (
                        <TableRow
                          key={order.id}
                          data-testid="admin-order-row"
                          data-order-id={order.id}
                        >
                          <TableCell className="font-mono font-medium">
                            {order.orderNumber ?? order.id.slice(0, 8)}
                            <p className="font-sans text-xs font-normal text-muted-foreground">
                              {date(order.createdAt)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{order.customerName ?? tCommon('guest')}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.customerEmail ?? '-'}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {currency(order.total, order.currency)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                paymentStatusClass(order.paymentStatus),
                              )}
                            >
                              {paymentStatusLabel(order.paymentStatus)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <OrderStatusBadge status={order.status} />
                              {targets.length > 0 ? (
                                <Select
                                  value=""
                                  onValueChange={(value) =>
                                    void handleStatusChange(order, value as AdminOrderStatus)
                                  }
                                  disabled={updateStatus.isPending}
                                >
                                  <SelectTrigger
                                    data-testid="admin-order-status-select"
                                    className="h-7 w-36 text-xs"
                                    aria-label={t('changeStatusFor', {
                                      order: order.orderNumber ?? order.id,
                                    })}
                                  >
                                    <SelectValue placeholder={t('advanceTo')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {targets.map((target) => (
                                      <SelectItem
                                        key={target}
                                        value={target}
                                        data-testid={`admin-order-status-option-${target}`}
                                      >
                                        {orderStatusLabel(tAdmin, target)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {order.trackingNumber ? (
                              <div className="flex items-center gap-2">
                                <Truck
                                  className="h-4 w-4 text-muted-foreground"
                                  aria-hidden="true"
                                />
                                <span className="font-mono text-sm">{order.trackingNumber}</span>
                                {order.courier ? (
                                  <span className="text-xs text-muted-foreground">
                                    ({order.courier})
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={t('viewDetails')}
                                onClick={() => setDetailId(order.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={t('createShipment')}
                                disabled={
                                  !canCreateShipment(order.status) || Boolean(order.trackingNumber)
                                }
                                onClick={() => {
                                  setShipmentTarget(order);
                                  setCourier('');
                                  setTrackingNumber('');
                                }}
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {tCommon('pageOf', { page, total: totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      {tCommon('previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                      {tCommon('next')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('detail.title', {
                order: detail.data?.orderNumber ?? detailId?.slice(0, 8) ?? '',
              })}
            </DialogTitle>
          </DialogHeader>
          {detail.isLoading ? (
            <AdminLoading label={t('detail.loading')} />
          ) : detail.isError ? (
            <AdminError error={detail.error} onRetry={() => void detail.refetch()} />
          ) : detail.data ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">{t('detail.customer')}</p>
                  <p className="font-medium">{detail.data.customerName ?? tCommon('guest')}</p>
                  <p className="text-sm text-muted-foreground">
                    {detail.data.customerEmail ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">{tCommon('status')}</p>
                  <OrderStatusBadge status={detail.data.status} />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('detail.placed', { date: date(detail.data.createdAt) })}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-xs uppercase text-muted-foreground">{t('detail.items')}</p>
                <div className="space-y-2">
                  {detail.data.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.qty} × {currency(item.unitPrice, detail.data?.currency)}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono">
                        {currency(item.subtotal, detail.data?.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('detail.subtotal')}</dt>
                  <dd className="font-mono">
                    {currency(detail.data.subtotal, detail.data.currency)}
                  </dd>
                </div>
                {detail.data.discount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {detail.data.voucherCode
                        ? t('detail.discountWithCode', { code: detail.data.voucherCode })
                        : t('detail.discount')}
                    </dt>
                    <dd className="font-mono">
                      -{currency(detail.data.discount, detail.data.currency)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('detail.shipping')}</dt>
                  <dd className="font-mono">
                    {currency(detail.data.shipping, detail.data.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('detail.tax')}</dt>
                  <dd className="font-mono">{currency(detail.data.tax, detail.data.currency)}</dd>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <dt>{t('detail.total')}</dt>
                  <dd className="font-mono">{currency(detail.data.total, detail.data.currency)}</dd>
                </div>
              </dl>

              {detail.data.notes ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{t('detail.notes')}</p>
                    <p className="text-sm">{detail.data.notes}</p>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={shipmentTarget !== null}
        onOpenChange={(open) => !open && setShipmentTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('shipment.title', {
                order: shipmentTarget?.orderNumber ?? shipmentTarget?.id.slice(0, 8) ?? '',
              })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShipment} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shipment-courier">{t('shipment.courier')}</Label>
              <Select value={courier} onValueChange={setCourier}>
                <SelectTrigger id="shipment-courier">
                  <SelectValue placeholder={t('shipment.selectCourier')} />
                </SelectTrigger>
                <SelectContent>
                  {COURIERS.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipment-tracking">{t('shipment.trackingNumber')}</Label>
              <Input
                id="shipment-tracking"
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder={t('shipment.trackingPlaceholder')}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShipmentTarget(null)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={createShipment.isPending}>
                {createShipment.isPending ? t('shipment.submitting') : t('shipment.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
