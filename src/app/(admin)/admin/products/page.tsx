'use client';

import { AlertTriangle, Edit, Plus, Search, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import Image from 'next/image';
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
  useAdminProducts,
  useDeleteAdminProduct,
  useUpdateAdminProductStock,
} from '@/entities/admin/hooks';
import type { AdminProduct } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const t = useTranslations('admin.products');
  const tCommon = useTranslations('admin.common');
  const { currency } = useAdminFormat();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const { toast } = useToast();

  const [stockTarget, setStockTarget] = useState<AdminProduct | null>(null);
  const [quickStock, setQuickStock] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);

  const query = useAdminProducts({ page, limit: PAGE_SIZE, search: debouncedSearch || undefined });
  const updateStock = useUpdateAdminProductStock();
  const deleteProduct = useDeleteAdminProduct();

  const products = query.data?.data ?? [];
  const totalItems = query.data?.pagination.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSaveStock = async () => {
    if (!stockTarget) return;
    try {
      await updateStock.mutateAsync({
        id: stockTarget.id,
        stock: quickStock,
        inStock: quickStock > 0,
      });
      toast({ title: t('toast.stockUpdated'), description: stockTarget.title, variant: 'success' });
      setStockTarget(null);
    } catch (error) {
      toast({
        title: t('toast.stockFailed'),
        description: error instanceof Error ? error.message : tCommon('unknownError'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct.mutateAsync(deleteTarget.id);
      toast({ title: t('toast.deleted'), description: deleteTarget.title, variant: 'success' });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: t('toast.deleteFailed'),
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
            <Link href="/admin/products/new" data-testid="admin-product-new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('add')}
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
          ) : products.length === 0 ? (
            <AdminEmpty
              message={debouncedSearch ? t('noMatches') : t('empty')}
              action={
                <Button asChild size="sm">
                  <Link href="/admin/products/new">{t('addFirst')}</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('columns.product')}</TableHead>
                      <TableHead>{t('columns.sku')}</TableHead>
                      <TableHead>{t('columns.category')}</TableHead>
                      <TableHead className="text-right">{t('columns.price')}</TableHead>
                      <TableHead>{t('columns.stock')}</TableHead>
                      <TableHead className="text-right">{tCommon('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow
                        key={product.id}
                        data-testid="admin-product-row"
                        data-product-id={product.id}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                              {product.thumbnail ? (
                                <Image
                                  src={product.thumbnail}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/admin/products/${product.id}/edit` as never}
                                className="font-medium hover:underline"
                                data-testid="admin-product-title"
                              >
                                {product.title}
                              </Link>
                              <p className="truncate text-xs text-muted-foreground">
                                {product.slug}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku ?? '-'}</TableCell>
                        <TableCell>{product.categoryName ?? '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {currency(product.price)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                product.stock > 10
                                  ? 'bg-green-100 text-green-800'
                                  : product.stock > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800',
                              )}
                            >
                              {product.stock > 0
                                ? t('units', { count: product.stock })
                                : t('outOfStock')}
                            </span>
                            {product.stock > 0 && product.stock <= 10 ? (
                              <AlertTriangle
                                className="h-4 w-4 text-amber-500"
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('updateStockFor', { title: product.title })}
                              onClick={() => {
                                setStockTarget(product);
                                setQuickStock(product.stock);
                              }}
                            >
                              {product.stock > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button asChild variant="ghost" size="icon">
                              <Link
                                href={`/admin/products/${product.id}/edit` as never}
                                aria-label={t('editProduct', { title: product.title })}
                                data-testid="admin-product-edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              aria-label={t('deleteProduct', { title: product.title })}
                              data-testid="admin-product-delete"
                              onClick={() => setDeleteTarget(product)}
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

      <Dialog open={stockTarget !== null} onOpenChange={(open) => !open && setStockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stockDialogTitle', { title: stockTarget?.title ?? '' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickStock((value) => Math.max(0, value - 10))}
              >
                -10
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickStock((value) => Math.max(0, value - 1))}
              >
                -1
              </Button>
              <Input
                type="number"
                min={0}
                value={quickStock}
                onChange={(event) => setQuickStock(Math.max(0, Number(event.target.value)))}
                className="w-20 text-center"
                aria-label={t('stockQuantity')}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickStock((value) => value + 1)}
              >
                +1
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickStock((value) => value + 10)}
              >
                +10
              </Button>
            </div>
            <Button className="w-full" onClick={handleSaveStock} disabled={updateStock.isPending}>
              {updateStock.isPending ? tCommon('saving') : tCommon('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialogTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.rich('deleteConfirm', {
              title: deleteTarget?.title ?? '',
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
              data-testid="admin-product-delete-confirm"
            >
              {deleteProduct.isPending ? tCommon('deleting') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
