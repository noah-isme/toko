'use client';

import { AlertTriangle, Edit, Plus, Search, Trash2, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
import {
  useAdminFlashSales,
  useCreateAdminFlashSale,
  useUpdateAdminFlashSaleStatus,
} from '@/entities/admin/hooks';
import type { AdminFlashSale, AdminFlashSaleStatus } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const PAGE_SIZE = 20;

const FLASH_SALE_STATUSES: AdminFlashSaleStatus[] = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED'];

const STATUS_COLORS: Record<AdminFlashSaleStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ENDED: 'bg-gray-100 text-gray-600',
};

export default function FlashSalesPage() {
  const t = useTranslations('admin.flashSales');
  const tCommon = useTranslations('admin.common');
  const { date } = useAdminFormat();
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
        title: t('toast.statusUpdated'),
        description: t('toast.statusChange', {
          name: statusTarget.flashSale.name,
          status: t(`status.${statusTarget.status}`),
        }),
        variant: 'success',
      });
      setStatusTarget(null);
    } catch (error) {
      toast({
        title: t('toast.statusFailed'),
        description: error instanceof Error ? error.message : tCommon('unknownError'),
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
        title: t('toast.deleteUnsupported'),
        description: t('toast.deleteUnsupportedHint'),
        variant: 'destructive',
      });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error instanceof Error ? error.message : tCommon('unknownError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild>
            <Link href="/admin/flash-sales/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('create')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>
            {t('all')}
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
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="pl-10"
              aria-label={t('searchLabel')}
            />
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <AdminLoading label={t('loading')} />
          ) : query.isError ? (
            <AdminError error={query.error} onRetry={() => void query.refetch()} />
          ) : flashSales.length === 0 ? (
            <AdminEmpty
              message={debouncedSearch ? t('noMatches') : t('empty')}
              action={
                <Button asChild size="sm">
                  <Link href="/admin/flash-sales/new">{t('createFirst')}</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('columns.campaign')}</TableHead>
                      <TableHead>{tCommon('status')}</TableHead>
                      <TableHead>{t('columns.period')}</TableHead>
                      <TableHead>{t('columns.items')}</TableHead>
                      <TableHead>{t('columns.totalSold')}</TableHead>
                      <TableHead className="text-right">{tCommon('actions')}</TableHead>
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
                            {t(`status.${fs.status}`)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" aria-hidden="true" />
                              <span>
                                {date(fs.startsAt)} → {date(fs.endsAt)}
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
                              aria-label={t('changeStatusFor', { name: fs.name })}
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
                                aria-label={t('editName', { name: fs.name })}
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              aria-label={t('deleteName', { name: fs.name })}
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

      <Dialog open={statusTarget !== null} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('statusDialogTitle', { name: statusTarget?.flashSale.name ?? '' })}
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            {t.rich('statusDialogFrom', {
              status: statusTarget ? t(`status.${statusTarget.flashSale.status}`) : '',
              strong: (chunks) => <strong>{chunks}</strong>,
            })}{' '}
            <select
              aria-label={t('newStatus')}
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
              {FLASH_SALE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="default"
              onClick={handleStatusChange}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? tCommon('saving') : t('updateStatus')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.rich('deleteConfirm', {
              name: deleteTarget?.name ?? '',
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled>
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
