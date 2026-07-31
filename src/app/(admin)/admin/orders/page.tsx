'use client';

import { Eye, Package, Search, Truck } from 'lucide-react';
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
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useAdminOrder,
  useAdminOrders,
  useAdminOrderStats,
  useCreateAdminShipment,
  useUpdateAdminOrderStatus,
} from '@/lib/api/hooks.admin';
import {
  ADMIN_ORDER_STATUSES,
  formatCurrency,
  formatDate,
  orderStatusLabel,
  type AdminOrder,
  type AdminOrderStatus,
} from '@/lib/api/services/admin';
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
  const totalItems = query.data?.pagination.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const handleStatusChange = async (order: AdminOrder, status: AdminOrderStatus) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, status });
      toast({
        title: 'Status updated',
        description: `${order.orderNumber ?? order.id.slice(0, 8)} → ${orderStatusLabel(status)}`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Could not update status',
        description: error instanceof Error ? error.message : 'Transition not allowed',
        variant: 'destructive',
      });
    }
  };

  const handleShipment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shipmentTarget) return;
    if (!courier || !trackingNumber.trim()) {
      toast({ title: 'Courier and tracking number are required', variant: 'destructive' });
      return;
    }
    try {
      await createShipment.mutateAsync({
        orderId: shipmentTarget.id,
        courier,
        trackingNumber: trackingNumber.trim(),
      });
      toast({ title: 'Shipment created', variant: 'success' });
      setShipmentTarget(null);
      setCourier('');
      setTrackingNumber('');
    } catch (error) {
      toast({
        title: 'Could not create shipment',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Orders" description="Manage and track customer orders" />

      {stats.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.totalOrders}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {formatCurrency(stats.data.totalRevenue)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.pendingOrders}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Order Value
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {formatCurrency(Math.round(stats.data.averageOrderValue))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              All Orders
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
                  placeholder="Search orders..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 sm:w-64"
                  aria-label="Search orders"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as AdminOrderStatus | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {ADMIN_ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {orderStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <AdminLoading label="Loading orders..." />
          ) : query.isError ? (
            <AdminError error={query.error} onRetry={() => void query.refetch()} />
          ) : orders.length === 0 ? (
            <AdminEmpty message="No orders match these filters." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Tracking</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const targets = allowedTargets(order.status);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono font-medium">
                            {order.orderNumber ?? order.id.slice(0, 8)}
                            <p className="font-sans text-xs font-normal text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{order.customerName ?? 'Guest'}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.customerEmail ?? '-'}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(order.total, order.currency)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                paymentStatusClass(order.paymentStatus),
                              )}
                            >
                              {order.paymentStatus || 'none'}
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
                                    className="h-7 w-36 text-xs"
                                    aria-label={`Change status for order ${order.orderNumber ?? order.id}`}
                                  >
                                    <SelectValue placeholder="Advance to..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {targets.map((target) => (
                                      <SelectItem key={target} value={target}>
                                        {orderStatusLabel(target)}
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
                                aria-label="View order details"
                                onClick={() => setDetailId(order.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Create shipment"
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
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                      Next
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
              Order {detail.data?.orderNumber ?? detailId?.slice(0, 8) ?? ''}
            </DialogTitle>
          </DialogHeader>
          {detail.isLoading ? (
            <AdminLoading label="Loading order..." />
          ) : detail.isError ? (
            <AdminError error={detail.error} onRetry={() => void detail.refetch()} />
          ) : detail.data ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Customer</p>
                  <p className="font-medium">{detail.data.customerName ?? 'Guest'}</p>
                  <p className="text-sm text-muted-foreground">
                    {detail.data.customerEmail ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Status</p>
                  <OrderStatusBadge status={detail.data.status} />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Placed {formatDate(detail.data.createdAt)}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-xs uppercase text-muted-foreground">Items</p>
                <div className="space-y-2">
                  {detail.data.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.qty} × {formatCurrency(item.unitPrice, detail.data?.currency)}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono">
                        {formatCurrency(item.subtotal, detail.data?.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-mono">
                    {formatCurrency(detail.data.subtotal, detail.data.currency)}
                  </dd>
                </div>
                {detail.data.discount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Discount{detail.data.voucherCode ? ` (${detail.data.voucherCode})` : ''}
                    </dt>
                    <dd className="font-mono">
                      -{formatCurrency(detail.data.discount, detail.data.currency)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="font-mono">
                    {formatCurrency(detail.data.shipping, detail.data.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="font-mono">
                    {formatCurrency(detail.data.tax, detail.data.currency)}
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <dt>Total</dt>
                  <dd className="font-mono">
                    {formatCurrency(detail.data.total, detail.data.currency)}
                  </dd>
                </div>
              </dl>

              {detail.data.notes ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Notes</p>
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
              Create Shipment for {shipmentTarget?.orderNumber ?? shipmentTarget?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShipment} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shipment-courier">Courier</Label>
              <Select value={courier} onValueChange={setCourier}>
                <SelectTrigger id="shipment-courier">
                  <SelectValue placeholder="Select courier" />
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
              <Label htmlFor="shipment-tracking">Tracking Number</Label>
              <Input
                id="shipment-tracking"
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder="Enter tracking number"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShipmentTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createShipment.isPending}>
                {createShipment.isPending ? 'Creating...' : 'Create Shipment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
