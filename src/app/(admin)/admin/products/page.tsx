'use client';

import { Edit, Plus, Search, Trash2, TrendingDown, TrendingUp, Upload, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';

import { useAdminErrorMessage } from '@/components/admin/admin-access-ui';
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { BulkActionDialog, type BulkKind } from '@/components/admin/catalog/bulk-action-dialog';
import { CsvExportButton } from '@/components/admin/catalog/csv-export-button';
import { SortableTableHead } from '@/components/admin/catalog/sortable-head';
import { ProductStatusBadge, StockStatusBadge } from '@/components/admin/catalog/status-badges';
import { UnsavedChangesDialog } from '@/components/admin/unsaved-changes-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { BULK_MAX_ITEMS } from '@/entities/admin/api/catalog-ops';
import {
  useAdminProducts,
  useDeleteAdminProduct,
  useExportProductsCsv,
  useUpdateAdminProductStock,
} from '@/entities/admin/hooks';
import {
  PRODUCT_STATUSES,
  STOCK_STATUSES,
  nextSort,
  parseProductListState,
  productListSearch,
  sortParam,
  type ProductListUrlState,
} from '@/entities/admin/product-list-params';
import type {
  AdminProduct,
  AdminProductSortField,
  AdminProductStatus,
  AdminStockStatus,
} from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const PAGE_SIZE = 20;
/** Radix Select cannot hold an empty value. */
const ALL = 'all';

/** Older backends omit `stockStatus`; fall back to a plain in/out reading. */
function stockStatusOf(product: AdminProduct): AdminStockStatus {
  return product.stockStatus ?? (product.stock > 0 || product.inStock ? 'in' : 'out');
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageContent() {
  const t = useTranslations('admin.products');
  const tCatalog = useTranslations('admin.catalog');
  const tCommon = useTranslations('admin.common');
  const { currency, day } = useAdminFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlState = parseProductListState(new URLSearchParams(searchParams.toString()));
  const { page, sort, status, stockStatus } = urlState;
  const [search, setSearch] = useState(urlState.q);
  const debouncedSearch = useDebouncedValue(search);
  // Re-seed the box when the URL query changes from outside (nav link, back button).
  // Our own debounced push lands with q === debouncedSearch, so it is left alone.
  const [seenQ, setSeenQ] = useState(urlState.q);
  if (urlState.q !== seenQ) {
    setSeenQ(urlState.q);
    if (urlState.q !== debouncedSearch) setSearch(urlState.q);
  }
  const { toast } = useToast();
  const adminErrorMessage = useAdminErrorMessage();

  const [stockTarget, setStockTarget] = useState<AdminProduct | null>(null);
  const [quickStock, setQuickStock] = useState(0);
  const guard = useUnsavedChangesGuard(stockTarget !== null && quickStock !== stockTarget.stock);
  const closeStock = () => setStockTarget(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  /** Selected products by id; kept across pages so a bulk action can span them. */
  const [selected, setSelected] = useState<Map<string, AdminProduct>>(new Map());
  const [bulkKind, setBulkKind] = useState<BulkKind | null>(null);
  const [rowErrors, setRowErrors] = useState<Map<string, string[]>>(new Map());

  const replaceUrl = (patch: Partial<ProductListUrlState>) => {
    const query = productListSearch({ ...urlState, ...patch });
    router.replace((query ? `${pathname}?${query}` : pathname) as never, { scroll: false });
  };

  // Push the debounced search into the URL (and back to page 1) once typing stops.
  useEffect(() => {
    if (debouncedSearch !== urlState.q) replaceUrl({ q: debouncedSearch, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value
  }, [debouncedSearch]);

  const filters = {
    search: urlState.q || undefined,
    status,
    stockStatus,
  };
  const query = useAdminProducts({ page, limit: PAGE_SIZE, sort: sortParam(urlState), ...filters });
  const updateStock = useUpdateAdminProductStock();
  const deleteProduct = useDeleteAdminProduct();
  const exportProducts = useExportProductsCsv();

  const products = query.data?.data ?? [];
  const totalItems = query.data?.pagination.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const hasFilters = Boolean(urlState.q || status || stockStatus);

  // A bulk edit or delete can empty the last page; step back to the last page that has rows.
  const emptyPastEnd = query.isSuccess && products.length === 0 && page > 1;
  useEffect(() => {
    if (!emptyPastEnd) return;
    const lastPage = totalItems > 0 ? totalPages : 1;
    if (lastPage < page) replaceUrl({ page: lastPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to landing on an empty page
  }, [emptyPastEnd, totalItems, totalPages, page]);

  const handleSort = (field: AdminProductSortField) => {
    replaceUrl({ sort: nextSort(sort, field), page: 1 });
  };

  const selectedOnPage = products.filter((product) => selected.has(product.id)).length;
  const pageSelection: boolean | 'indeterminate' =
    products.length > 0 && selectedOnPage === products.length
      ? true
      : selectedOnPage > 0
        ? 'indeterminate'
        : false;
  const atLimit = selected.size >= BULK_MAX_ITEMS;

  const toggleRow = (product: AdminProduct, checked: boolean) => {
    setSelected((current) => {
      const next = new Map(current);
      if (checked && next.size < BULK_MAX_ITEMS) next.set(product.id, product);
      else next.delete(product.id);
      return next;
    });
  };

  const togglePage = (checked: boolean) => {
    setSelected((current) => {
      const next = new Map(current);
      for (const product of products) {
        if (!checked) next.delete(product.id);
        else if (next.size < BULK_MAX_ITEMS) next.set(product.id, product);
      }
      return next;
    });
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
        description: adminErrorMessage(error, tCommon('unknownError')),
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
        description: adminErrorMessage(error, tCommon('unknownError')),
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
          <>
            <CsvExportButton
              label={tCatalog('export.productsLabel')}
              onExport={() => exportProducts.mutateAsync(filters)}
              testId="admin-products-export"
            />
            <Button asChild variant="outline">
              <Link href={'/admin/products/import' as never} data-testid="admin-products-import">
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                {tCatalog('import.button')}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/products/new" data-testid="admin-product-new">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('add')}
              </Link>
            </Button>
          </>
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Select
              value={status ?? ALL}
              onValueChange={(value) =>
                replaceUrl({
                  status: value === ALL ? undefined : (value as AdminProductStatus),
                  page: 1,
                })
              }
            >
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label={tCatalog('filters.status')}
                data-testid="admin-products-status-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{tCatalog('filters.allStatuses')}</SelectItem>
                {PRODUCT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {tCatalog(`status.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={stockStatus ?? ALL}
              onValueChange={(value) =>
                replaceUrl({
                  stockStatus: value === ALL ? undefined : (value as AdminStockStatus),
                  page: 1,
                })
              }
            >
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label={tCatalog('filters.stockStatus')}
                data-testid="admin-products-stock-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{tCatalog('filters.allStock')}</SelectItem>
                {STOCK_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {tCatalog(`stockStatus.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-64">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
                aria-label={t('searchLabel')}
              />
            </div>
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  replaceUrl({ q: '', status: undefined, stockStatus: undefined, page: 1 });
                }}
              >
                <X className="mr-1 h-4 w-4" aria-hidden="true" />
                {tCatalog('filters.clear')}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {selected.size > 0 ? (
            <div
              role="toolbar"
              aria-label={tCatalog('bulk.toolbar')}
              className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3"
              data-testid="admin-products-bulk-bar"
            >
              <p className="mr-auto text-sm font-medium" aria-live="polite">
                {tCatalog('selection.selected', { count: selected.size })}
                {atLimit ? (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {tCatalog('selection.limit', { max: BULK_MAX_ITEMS })}
                  </span>
                ) : null}
              </p>
              <Button size="sm" variant="outline" onClick={() => setBulkKind('price')}>
                {tCatalog('bulk.setPrice')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBulkKind('stock')}>
                {tCatalog('bulk.adjustStock')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBulkKind('status')}>
                {tCatalog('bulk.changeStatus')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelected(new Map());
                  setRowErrors(new Map());
                }}
              >
                {tCatalog('selection.clear')}
              </Button>
            </div>
          ) : null}
          {query.isLoading ? (
            <AdminLoading label={t('loading')} />
          ) : query.isError ? (
            <AdminError error={query.error} onRetry={() => void query.refetch()} />
          ) : products.length === 0 ? (
            <AdminEmpty
              message={hasFilters ? t('noMatches') : t('empty')}
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
                      <TableHead className="w-10">
                        <Checkbox
                          checked={pageSelection}
                          onCheckedChange={(checked) => togglePage(checked === true)}
                          aria-label={tCatalog('selection.selectPage')}
                          data-testid="admin-products-select-page"
                        />
                      </TableHead>
                      <SortableTableHead
                        field="name"
                        label={t('columns.product')}
                        sort={sort}
                        onSort={handleSort}
                      />
                      <TableHead>{t('columns.sku')}</TableHead>
                      <TableHead>{t('columns.category')}</TableHead>
                      <TableHead>{tCatalog('columns.status')}</TableHead>
                      <SortableTableHead
                        field="price"
                        label={t('columns.price')}
                        sort={sort}
                        onSort={handleSort}
                        className="text-right"
                      />
                      <SortableTableHead
                        field="stock"
                        label={t('columns.stock')}
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableTableHead
                        field="updated"
                        label={tCatalog('columns.updated')}
                        sort={sort}
                        onSort={handleSort}
                      />
                      <TableHead className="text-right">{tCommon('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const errors = rowErrors.get(product.id);
                      const errorId = `product-errors-${product.id}`;
                      const productStock = stockStatusOf(product);
                      return (
                        <TableRow
                          key={product.id}
                          data-testid="admin-product-row"
                          data-product-id={product.id}
                          data-state={selected.has(product.id) ? 'selected' : undefined}
                          className={cn(errors && 'bg-destructive/5')}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selected.has(product.id)}
                              disabled={atLimit && !selected.has(product.id)}
                              onCheckedChange={(checked) => toggleRow(product, checked === true)}
                              aria-label={tCatalog('selection.selectRow', { title: product.title })}
                              aria-describedby={errors ? errorId : undefined}
                              aria-invalid={errors ? true : undefined}
                            />
                          </TableCell>
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
                                {errors ? (
                                  <ul
                                    id={errorId}
                                    className="mt-1 space-y-0.5 text-xs text-destructive"
                                    aria-label={tCatalog('bulk.rowErrorsLabel', {
                                      title: product.title,
                                    })}
                                    data-testid="admin-product-row-errors"
                                  >
                                    {errors.map((message) => (
                                      <li key={message}>{message}</li>
                                    ))}
                                  </ul>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{product.sku ?? '-'}</TableCell>
                          <TableCell>{product.categoryName ?? '-'}</TableCell>
                          <TableCell>
                            <ProductStatusBadge status={product.status ?? 'published'} />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {currency(product.price)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              {product.stock > 0 ? (
                                <span className="text-sm">
                                  {t('units', { count: product.stock })}
                                </span>
                              ) : null}
                              <StockStatusBadge status={productStock} />
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {day(product.updatedAt)}
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
                      onClick={() => replaceUrl({ page: Math.max(1, page - 1) })}
                    >
                      {tCommon('previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => replaceUrl({ page: Math.min(totalPages, page + 1) })}
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

      <BulkActionDialog
        kind={bulkKind}
        products={[...selected.values()]}
        onClose={() => setBulkKind(null)}
        onRowErrors={setRowErrors}
        onApplied={() => {
          setBulkKind(null);
          setSelected(new Map());
          setRowErrors(new Map());
        }}
      />

      <Dialog
        open={stockTarget !== null}
        onOpenChange={(open) => !open && guard.confirmNavigation(closeStock)}
      >
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

      <UnsavedChangesDialog guard={guard} />
    </div>
  );
}
