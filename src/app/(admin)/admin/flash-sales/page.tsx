'use client';

import { AlertTriangle, Edit, Plus, Search, Trash2, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
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
  useAdminFlashSales,
  useCreateAdminFlashSale,
  useUpdateAdminFlashSaleStatus,
} from '@/lib/api/hooks.admin';
import {
  formatCurrency,
  formatDate,
  type AdminFlashSale,
  type AdminFlashSaleStatus,
} from '@/lib/api/services/admin';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<AdminFlashSaleStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  ENDED: 'Ended',
};

const STATUS_COLORS: Record<AdminFlashSaleStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ENDED: 'bg-gray-100 text-gray-600',
};

export default function FlashSalesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<AdminFlashSale | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    flashSale: AdminFlashSale;
    status: AdminFlashSaleStatus;
  } | null>(null);

  const query = useAdminFlashSales({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const createFlashSale = useCreateAdminFlashSale();
  const updateStatus = useUpdateAdminFlashSaleStatus();

  const flashSales = query.data?.data ?? [];
  const totalItems = query.data?.pagination.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    try {
      await updateStatus.mutateAsync({
        id: statusTarget.flashSale.id,
        status: statusTarget.status,
      });
      toast({
        title: 'Status updated',
        description: `${statusTarget.flashSale.name} → ${STATUS_LABELS[statusTarget.status]}`,
        variant: 'success',
      });
      setStatusTarget(null);
    } catch (error) {
      toast({
        title: 'Could not update status',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Backend doesn't have delete endpoint, but we can use the status to 'ENDED' or similar
      // For now, just show toast - in reality you'd need a delete endpoint
      toast({
        title: 'Delete not implemented',
        description: 'Backend does not support delete. Set status to ENDED.',
        variant: 'destructive',
      });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Flash Sales"
        description="Manage limited-time flash sale campaigns"
        actions={
          <Button asChild>
            <Link href="/admin/flash-sales/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create Flash Sale
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>
            All Flash Sales
            {totalItems > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({totalItems})</span>
            ) : null}
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search flash sales..."
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="pl-10"
              aria-label="Search flash sales"
            />
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <AdminLoading label="Loading flash sales..." />
          ) : query.isError ? (
            <AdminError error={query.error} onRetry={() => void query.refetch()} />
          ) : flashSales.length === 0 ? (
            <AdminEmpty
              message={
                debouncedSearch ? 'No flash sales match your search.' : 'No flash sales yet.'
              }
              action={
                <Button asChild size="sm">
                  <Link href="/admin/flash-sales/new">Create your first flash sale</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total Sold</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flashSales.map((fs) => (
                      <TableRow key={fs.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/flash-sales/${fs.id}/edit` as never}
                              className="font-medium hover:underline"
                            >
                              {fs.name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">{fs.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              STATUS_COLORS[fs.status],
                            )}
                          >
                            {STATUS_LABELS[fs.status]}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" aria-hidden="true" />
                              <span>
                                {formatDate(fs.startsAt)} → {formatDate(fs.endsAt)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{fs.items.length}</TableCell>
                        <TableCell>
                          {fs.items.reduce((sum, item) => sum + item.soldCount, 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Change status for ${fs.name}`}
                              onClick={() =>
                                setStatusTarget({
                                  flashSale: fs,
                                  status: fs.status === 'ACTIVE' ? 'ENDED' : 'ACTIVE',
                                })
                              }
                            >
                              {fs.status === 'ACTIVE' ? (
                                <Clock className="h-4 w-4 text-amber-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <Button asChild variant="ghost" size="icon">
                              <Link
                                href={`/admin/flash-sales/${fs.id}/edit` as never}
                                aria-label={`Edit ${fs.name}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              aria-label={`Delete ${fs.name}`}
                              onClick={() => setDeleteTarget(fs)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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

      <Dialog open={statusTarget !== null} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status: {statusTarget?.flashSale.name}</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            Change status from{' '}
            <strong>{statusTarget ? STATUS_LABELS[statusTarget.flashSale.status] : ''}</strong> to{' '}
            <select
              value={statusTarget?.status}
              onChange={(e) =>
                setStatusTarget(
                  statusTarget
                    ? { ...statusTarget, status: e.target.value as AdminFlashSaleStatus }
                    : null,
                )
              }
              className="ml-2 rounded border px-2 py-1"
            >
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
            </select>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleStatusChange}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Saving...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Flash Sale</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
            cannot be undone. Note: Backend does not have a delete endpoint; consider setting status
            to ENDED instead.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
