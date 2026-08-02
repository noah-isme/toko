'use client';

import { Loader2, Plus, Save, Trash2, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminProducts } from '@/lib/api/hooks.admin';
import {
  useAdminFlashSale,
  useUpdateAdminFlashSaleStatus,
  useCreateAdminFlashSale,
} from '@/lib/api/hooks.admin';
import {
  formatCurrency,
  formatDate,
  type AdminFlashSale,
  type AdminFlashSaleStatus,
} from '@/lib/api/services/admin';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const NONE = '__none__';

interface FlashSaleItemRow {
  id?: string;
  productId: string;
  salePrice: number;
  stockLimit: number | '';
}

interface FlashSaleFormValues {
  name: string;
  slug: string;
  status: AdminFlashSaleStatus;
  startsAt: string;
  endsAt: string;
  items: FlashSaleItemRow[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

function flashSaleToFormValues(fs: AdminFlashSale): FlashSaleFormValues {
  return {
    name: fs.name,
    slug: fs.slug,
    status: fs.status,
    startsAt: new Date(fs.startsAt).toISOString().slice(0, 16),
    endsAt: new Date(fs.endsAt).toISOString().slice(0, 16),
    items: fs.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      salePrice: item.salePrice,
      stockLimit: item.stockLimit ?? '',
    })),
  };
}

function formValuesToInput(values: FlashSaleFormValues) {
  const items = values.items
    .filter((item) => item.productId !== NONE)
    .map((item) => ({
      productId: item.productId,
      salePrice: Math.max(0, Math.round(item.salePrice)),
      stockLimit:
        item.stockLimit === '' ? null : Math.max(0, Math.round(Number(item.stockLimit))) || null,
    }));

  return {
    name: values.name.trim(),
    slug: values.slug.trim() || slugify(values.name),
    status: values.status,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    items,
  };
}

export default function FlashSaleEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const flashSaleId = params.id as string;

  const [values, setValues] = useState<FlashSaleFormValues | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productsQuery = useAdminProducts({ limit: 1000 });
  const flashSaleQuery = useAdminFlashSale(flashSaleId);
  const createMutation = useCreateAdminFlashSale();
  const updateStatusMutation = useUpdateAdminFlashSaleStatus();

  const update = <K extends keyof FlashSaleFormValues>(key: K, value: FlashSaleFormValues[K]) => {
    setValues((current) => (current ? { ...current, [key]: value } : null));
  };

  const updateItem = (
    index: number,
    field: keyof FlashSaleItemRow,
    value: FlashSaleItemRow[typeof field],
  ) => {
    setValues((current) => {
      if (!current) return null;
      const next = [...current.items];
      next[index] = { ...next[index], [field]: value };
      return { ...current, items: next };
    });
  };

  const addItem = () => {
    setValues((current) =>
      current
        ? {
            ...current,
            items: [...current.items, { productId: NONE, salePrice: 0, stockLimit: '' }],
          }
        : null,
    );
  };

  const removeItem = (index: number) => {
    setValues((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((_, i) => i !== index),
          }
        : null,
    );
  };

  // Initialize form values when flash sale data loads
  const fs = flashSaleQuery.data;
  if (fs && !values) {
    setValues(flashSaleToFormValues(fs));
  }

  const handleStatusChange = async (newStatus: AdminFlashSaleStatus) => {
    if (!values) return;
    try {
      await updateStatusMutation.mutateAsync({ id: flashSaleId, status: newStatus });
      toast({
        title: 'Status updated',
        description: `${values.name} → ${STATUS_LABELS[newStatus]}`,
        variant: 'success',
      });
      setValues((current) => (current ? { ...current, status: newStatus } : null));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast({ title: 'Could not update status', description: message, variant: 'destructive' });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!values) return;

    if (!values.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!values.startsAt || !values.endsAt) {
      setError('Start and end dates are required');
      return;
    }
    if (new Date(values.endsAt) <= new Date(values.startsAt)) {
      setError('End date must be after start date');
      return;
    }
    if (values.items.filter((i) => i.productId !== NONE).length === 0) {
      setError('At least one product is required');
      return;
    }
    if (values.items.some((i) => i.productId !== NONE && i.salePrice <= 0)) {
      setError('Sale price must be greater than 0 for all items');
      return;
    }

    try {
      const input = formValuesToInput(values);
      const result = await createMutation.mutateAsync(input);
      toast({ title: 'Flash sale created (duplicate)', variant: 'success' });
      router.push(`/admin/flash-sales/${result.id}/edit`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update flash sale';
      setError(message);
      toast({ title: 'Could not update flash sale', description: message, variant: 'destructive' });
    }
  };

  if (flashSaleQuery.isLoading || productsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Edit Flash Sale" description="Update campaign details" />
        <AdminLoading label="Loading..." />
      </div>
    );
  }

  if (flashSaleQuery.isError || productsQuery.isError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Edit Flash Sale" description="Update campaign details" />
        <AdminError
          error={flashSaleQuery.error ?? productsQuery.error}
          onRetry={() => {
            void flashSaleQuery.refetch();
            void productsQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (!flashSaleQuery.data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Edit Flash Sale" description="Update campaign details" />
        <AdminError
          error={new Error('Flash sale not found')}
          onRetry={() => void flashSaleQuery.refetch()}
        />
      </div>
    );
  }

  const flashSale = flashSaleQuery.data!;
  const products = productsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Edit Flash Sale"
        description={flashSale.name}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/flash-sales">Back to list</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/flash-sales/new">Create New</Link>
            </Button>
          </>
        }
      />

      {error && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fs-name">Name</Label>
                <Input
                  id="fs-name"
                  value={values?.name ?? ''}
                  onChange={(event) => {
                    const name = event.target.value;
                    setValues((current) =>
                      current
                        ? {
                            ...current,
                            name,
                            slug: slugTouched ? current.slug : slugify(name),
                          }
                        : null,
                    );
                  }}
                  placeholder="Summer Flash Sale"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fs-slug">Slug</Label>
                <Input
                  id="fs-slug"
                  value={values?.slug ?? ''}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update('slug', event.target.value);
                  }}
                  placeholder="summer-flash-sale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fs-status">Status</Label>
                <Select
                  value={values?.status ?? 'DRAFT'}
                  onValueChange={(value) => update('status', value as AdminFlashSaleStatus)}
                >
                  <SelectTrigger id="fs-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ENDED">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fs-starts-at">Start Date & Time</Label>
                <Input
                  id="fs-starts-at"
                  type="datetime-local"
                  value={values?.startsAt ?? ''}
                  onChange={(event) => update('startsAt', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fs-ends-at">End Date & Time</Label>
                <Input
                  id="fs-ends-at"
                  type="datetime-local"
                  value={values?.endsAt ?? ''}
                  onChange={(event) => update('endsAt', event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium">Current Status</h4>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    STATUS_COLORS[values?.status ?? 'DRAFT'],
                  )}
                >
                  {STATUS_LABELS[values?.status ?? 'DRAFT']}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED'] as AdminFlashSaleStatus[]).map(
                  (status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={values?.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      disabled={values?.status === status || updateStatusMutation.isPending}
                      className={cn(
                        STATUS_COLORS[status].replace('bg-', 'border-').replace('text-', 'text-'),
                      )}
                    >
                      {status}
                      {values?.status === status && <Clock className="ml-1 h-3 w-3 animate-spin" />}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Flash Sale Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={products.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Product
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products available. Create products first.
              </p>
            ) : !values || values.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No items added yet. Click &quot;Add Product&quot; to start.
              </p>
            ) : (
              values!.items.map((item, index) => (
                <div key={item.id ?? `new-${index}`} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">Item {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`fs-item-product-${index}`}>Product</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) => updateItem(index, 'productId', value)}
                      >
                        <SelectTrigger id={`fs-item-product-${index}`}>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Select a product...</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.title} ({formatCurrency(product.price)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`fs-item-sale-price-${index}`}>Sale Price (Rp)</Label>
                      <Input
                        id={`fs-item-sale-price-${index}`}
                        type="number"
                        min={0}
                        step={100}
                        value={item.salePrice}
                        onChange={(event) =>
                          updateItem(index, 'salePrice', Number(event.target.value))
                        }
                        placeholder="e.g. 1500000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`fs-item-stock-limit-${index}`}>Stock Limit (optional)</Label>
                      <Input
                        id={`fs-item-stock-limit-${index}`}
                        type="number"
                        min={0}
                        value={item.stockLimit}
                        onChange={(event) => updateItem(index, 'stockLimit', event.target.value)}
                        placeholder="Leave empty for no limit"
                      />
                      <p className="text-xs text-muted-foreground">Empty = use catalog stock</p>
                    </div>
                  </div>
                  {item.id && (
                    <div className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                      <div className="flex flex-wrap gap-4">
                        <span>
                          <Calendar className="mr-1 inline h-3 w-3" /> ID: {item.id}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                Save Changes (Creates New)
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/flash-sales')}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
