'use client';

import { Calendar, DollarSign, Edit, Percent, Plus, Search, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  ActiveBadge,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from '@/components/admin/admin-ui';
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
import { Label } from '@/components/ui/label';
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
import { datetimeLocalToIso, isoToDatetimeLocal } from '@/entities/admin/datetime-local';
import { isVoucherActive, voucherValueLabel } from '@/entities/admin/format';
import {
  useAdminVouchers,
  useAdminVoucherStats,
  useCreateAdminVoucher,
  useDeleteAdminVoucher,
  useUpdateAdminVoucher,
} from '@/entities/admin/hooks';
import type { AdminVoucher, AdminVoucherInput, AdminVoucherKind } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const PAGE_SIZE = 20;

interface VoucherForm {
  code: string;
  kind: AdminVoucherKind;
  /** Percent value in whole percent for percent vouchers, rupiah for fixed. */
  amount: number;
  minSpend: number;
  usageLimit: string;
  perUserLimit: string;
  validFrom: string;
  validTo: string;
  combinable: boolean;
  priority: number;
}

const EMPTY_FORM: VoucherForm = {
  code: '',
  kind: 'percent',
  amount: 10,
  minSpend: 0,
  usageLimit: '',
  perUserLimit: '',
  validFrom: '',
  validTo: '',
  combinable: false,
  priority: 0,
};

function formToPayload(form: VoucherForm): AdminVoucherInput {
  const percent = form.kind === 'percent';
  return {
    code: form.code.trim().toUpperCase(),
    kind: form.kind,
    // The backend stores percent discounts in basis points and leaves `value` at 0.
    value: percent ? 0 : Math.max(0, Math.round(form.amount)),
    percentBps: percent ? Math.max(0, Math.round(form.amount * 100)) : null,
    minSpend: Math.max(0, Math.round(form.minSpend)),
    usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
    perUserLimit: form.perUserLimit === '' ? null : Number(form.perUserLimit),
    validFrom: datetimeLocalToIso(form.validFrom) || null,
    validTo: datetimeLocalToIso(form.validTo) || null,
    combinable: form.combinable,
    priority: form.priority,
  };
}

function voucherToForm(voucher: AdminVoucher): VoucherForm {
  return {
    code: voucher.code,
    kind: voucher.kind,
    amount: voucher.kind === 'percent' ? (voucher.percentBps ?? 0) / 100 : voucher.value,
    minSpend: voucher.minSpend,
    usageLimit: voucher.usageLimit == null ? '' : String(voucher.usageLimit),
    perUserLimit: voucher.perUserLimit == null ? '' : String(voucher.perUserLimit),
    validFrom: isoToDatetimeLocal(voucher.validFrom),
    validTo: isoToDatetimeLocal(voucher.validTo),
    combinable: voucher.combinable,
    priority: voucher.priority,
  };
}

export default function VouchersPage() {
  const t = useTranslations('admin.vouchers');
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('admin.common');
  const { format, currency, day } = useAdminFormat();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminVoucher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminVoucher | null>(null);
  const [form, setForm] = useState<VoucherForm>(EMPTY_FORM);

  const query = useAdminVouchers({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const stats = useAdminVoucherStats();
  const createVoucher = useCreateAdminVoucher();
  const updateVoucher = useUpdateAdminVoucher();
  const deleteVoucher = useDeleteAdminVoucher();

  const vouchers = query.data?.data ?? [];
  const totalItems = query.data?.pagination.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const saving = createVoucher.isPending || updateVoucher.isPending;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (voucher: AdminVoucher) => {
    setEditing(voucher);
    setForm(voucherToForm(voucher));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = formToPayload(form);
    if (!payload.code) {
      toast({ title: t('toast.codeRequired'), variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await updateVoucher.mutateAsync({ code: editing.code, data: payload });
        toast({ title: t('toast.updated'), description: payload.code, variant: 'success' });
      } else {
        await createVoucher.mutateAsync(payload);
        toast({ title: t('toast.created'), description: payload.code, variant: 'success' });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      toast({
        title: t('toast.saveFailed'),
        description: error instanceof Error ? error.message : tCommon('unknownError'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVoucher.mutateAsync(deleteTarget.code);
      toast({ title: t('toast.deleted'), description: deleteTarget.code, variant: 'success' });
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
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('create')}
          </Button>
        }
      />

      {stats.data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.total')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.totalVouchers}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.active')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.activeVouchers}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.redemptions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.totalUsage}</CardContent>
          </Card>
        </div>
      ) : null}

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
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
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
          ) : vouchers.length === 0 ? (
            <AdminEmpty
              message={debouncedSearch ? t('noMatches') : t('empty')}
              action={
                <Button size="sm" onClick={openCreate}>
                  {t('create')}
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('columns.code')}</TableHead>
                      <TableHead>{t('columns.kind')}</TableHead>
                      <TableHead className="text-right">{t('columns.value')}</TableHead>
                      <TableHead className="text-right">{t('columns.minSpend')}</TableHead>
                      <TableHead>{t('columns.usage')}</TableHead>
                      <TableHead>{t('columns.period')}</TableHead>
                      <TableHead>{tCommon('status')}</TableHead>
                      <TableHead className="text-right">{tCommon('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-mono font-medium">{voucher.code}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                              voucher.kind === 'percent'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800',
                            )}
                          >
                            {voucher.kind === 'percent' ? (
                              <Percent className="mr-1 h-3 w-3" aria-hidden="true" />
                            ) : (
                              <DollarSign className="mr-1 h-3 w-3" aria-hidden="true" />
                            )}
                            {tAdmin(`voucher.kind.${voucher.kind}`)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {voucherValueLabel(tAdmin, format, voucher)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {voucher.minSpend > 0 ? currency(voucher.minSpend) : '-'}
                        </TableCell>
                        <TableCell>
                          {voucher.usageLimit == null ? (
                            <span className="font-mono text-sm text-muted-foreground">
                              {voucher.usedCount} / ∞
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-muted">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{
                                    width: `${Math.min((voucher.usedCount / voucher.usageLimit) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="font-mono text-sm text-muted-foreground">
                                {voucher.usedCount}/{voucher.usageLimit}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {voucher.validFrom || voucher.validTo ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar
                                className="h-3 w-3 text-muted-foreground"
                                aria-hidden="true"
                              />
                              <span>
                                {voucher.validFrom ? day(voucher.validFrom) : t('openEnded')}
                                {' - '}
                                {voucher.validTo ? day(voucher.validTo) : t('openEnded')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t('always')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ActiveBadge active={isVoucherActive(voucher)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('editCode', { code: voucher.code })}
                              onClick={() => openEdit(voucher)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              aria-label={t('deleteCode', { code: voucher.code })}
                              onClick={() => setDeleteTarget(voucher)}
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t('edit') : t('create')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voucher-code">{t('form.code')}</Label>
              <Input
                id="voucher-code"
                value={form.code}
                disabled={editing !== null}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                }
                placeholder="WELCOME10"
              />
              {editing ? (
                <p className="text-xs text-muted-foreground">{t('form.codeLocked')}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-kind">{t('form.kind')}</Label>
              <Select
                value={form.kind}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, kind: value as AdminVoucherKind }))
                }
              >
                <SelectTrigger id="voucher-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">{t('form.kindPercent')}</SelectItem>
                  <SelectItem value="fixed_amount">{t('form.kindFixed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-amount">
                {form.kind === 'percent' ? t('form.percentOff') : t('form.amountOff')}
              </Label>
              <Input
                id="voucher-amount"
                type="number"
                min={0}
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-min-spend">{t('form.minSpend')}</Label>
              <Input
                id="voucher-min-spend"
                type="number"
                min={0}
                value={form.minSpend}
                onChange={(event) =>
                  setForm((current) => ({ ...current, minSpend: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-usage-limit">{t('form.usageLimit')}</Label>
              <Input
                id="voucher-usage-limit"
                type="number"
                min={0}
                value={form.usageLimit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, usageLimit: event.target.value }))
                }
                placeholder={t('form.unlimited')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-per-user">{t('form.perUserLimit')}</Label>
              <Input
                id="voucher-per-user"
                type="number"
                min={0}
                value={form.perUserLimit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, perUserLimit: event.target.value }))
                }
                placeholder={t('form.unlimited')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-valid-from">{t('form.validFrom')}</Label>
              <Input
                id="voucher-valid-from"
                type="datetime-local"
                value={form.validFrom}
                onChange={(event) =>
                  setForm((current) => ({ ...current, validFrom: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-valid-to">{t('form.validTo')}</Label>
              <Input
                id="voucher-valid-to"
                type="datetime-local"
                value={form.validTo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, validTo: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-priority">{t('form.priority')}</Label>
              <Input
                id="voucher-priority"
                type="number"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({ ...current, priority: Number(event.target.value) }))
                }
              />
              <p className="text-xs text-muted-foreground">{t('form.priorityHint')}</p>
            </div>
            <div className="flex items-center gap-2 self-end">
              <Checkbox
                id="voucher-combinable"
                checked={form.combinable}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, combinable: checked === true }))
                }
              />
              <Label htmlFor="voucher-combinable">{t('form.combinable')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? tCommon('saving') : editing ? t('form.update') : t('form.create')}
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
              code: deleteTarget?.code ?? '',
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteVoucher.isPending}>
              {deleteVoucher.isPending ? tCommon('deleting') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
