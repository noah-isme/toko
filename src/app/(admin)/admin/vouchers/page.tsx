'use client';

import { Calendar, DollarSign, Edit, Percent, Plus, Search, Trash2 } from 'lucide-react';
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
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useAdminVouchers,
  useAdminVoucherStats,
  useCreateAdminVoucher,
  useDeleteAdminVoucher,
  useUpdateAdminVoucher,
} from '@/lib/api/hooks.admin';
import {
  formatCurrency,
  isVoucherActive,
  voucherValueLabel,
  type AdminVoucher,
  type AdminVoucherInput,
  type AdminVoucherKind,
} from '@/lib/api/services/admin';
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

/** `datetime-local` needs `YYYY-MM-DDTHH:mm`, the API returns RFC3339. */
function toLocalInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toRfc3339(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

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
    validFrom: toRfc3339(form.validFrom),
    validTo: toRfc3339(form.validTo),
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
    validFrom: toLocalInput(voucher.validFrom),
    validTo: toLocalInput(voucher.validTo),
    combinable: voucher.combinable,
    priority: voucher.priority,
  };
}

export default function VouchersPage() {
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
      toast({ title: 'Code is required', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await updateVoucher.mutateAsync({ code: editing.code, data: payload });
        toast({ title: 'Voucher updated', description: payload.code, variant: 'success' });
      } else {
        await createVoucher.mutateAsync(payload);
        toast({ title: 'Voucher created', description: payload.code, variant: 'success' });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      toast({
        title: 'Could not save voucher',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVoucher.mutateAsync(deleteTarget.code);
      toast({ title: 'Voucher deleted', description: deleteTarget.code, variant: 'success' });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: 'Could not delete voucher',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vouchers"
        description="Manage discount codes and promotions"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Create Voucher
          </Button>
        }
      />

      {stats.data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Vouchers
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.totalVouchers}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.activeVouchers}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Redemptions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.data.totalUsage}</CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>
            All Vouchers
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
              placeholder="Search vouchers..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-10"
              aria-label="Search vouchers"
            />
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <AdminLoading label="Loading vouchers..." />
          ) : query.isError ? (
            <AdminError error={query.error} onRetry={() => void query.refetch()} />
          ) : vouchers.length === 0 ? (
            <AdminEmpty
              message={debouncedSearch ? 'No vouchers match your search.' : 'No vouchers yet.'}
              action={
                <Button size="sm" onClick={openCreate}>
                  Create Voucher
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Min Spend</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                            {voucher.kind === 'percent' ? 'Percent' : 'Fixed'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {voucherValueLabel(voucher)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {voucher.minSpend > 0 ? formatCurrency(voucher.minSpend) : '-'}
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
                                {voucher.validFrom
                                  ? new Date(voucher.validFrom).toLocaleDateString('id-ID')
                                  : '...'}
                                {' - '}
                                {voucher.validTo
                                  ? new Date(voucher.validTo).toLocaleDateString('id-ID')
                                  : '...'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Always</span>
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
                              aria-label={`Edit ${voucher.code}`}
                              onClick={() => openEdit(voucher)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              aria-label={`Delete ${voucher.code}`}
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Voucher' : 'Create Voucher'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voucher-code">Code</Label>
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
                <p className="text-xs text-muted-foreground">Code cannot be changed.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-kind">Kind</Label>
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
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-amount">
                {form.kind === 'percent' ? 'Percent off' : 'Discount amount (Rp)'}
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
              <Label htmlFor="voucher-min-spend">Min Spend (Rp)</Label>
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
              <Label htmlFor="voucher-usage-limit">Usage Limit</Label>
              <Input
                id="voucher-usage-limit"
                type="number"
                min={0}
                value={form.usageLimit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, usageLimit: event.target.value }))
                }
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-per-user">Per Customer Limit</Label>
              <Input
                id="voucher-per-user"
                type="number"
                min={0}
                value={form.perUserLimit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, perUserLimit: event.target.value }))
                }
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-valid-from">Valid From</Label>
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
              <Label htmlFor="voucher-valid-to">Valid To</Label>
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
              <Label htmlFor="voucher-priority">Priority</Label>
              <Input
                id="voucher-priority"
                type="number"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({ ...current, priority: Number(event.target.value) }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Higher priority wins when several vouchers match.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end">
              <Checkbox
                id="voucher-combinable"
                checked={form.combinable}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, combinable: checked === true }))
                }
              />
              <Label htmlFor="voucher-combinable">Combinable with other vouchers</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Voucher</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteTarget?.code}</strong>? Orders that already used it keep their
            discount.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteVoucher.isPending}>
              {deleteVoucher.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
