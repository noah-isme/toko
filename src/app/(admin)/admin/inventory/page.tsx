'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminInventory, useUpdateAdminInventory } from '@/entities/admin/hooks';
import { useToast } from '@/shared/ui/toast';

export default function InventoryPage() {
  const t = useTranslations('admin.inventory');
  const tCommon = useTranslations('admin.common');
  const query = useAdminInventory();
  const update = useUpdateAdminInventory();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (query.isLoading) return <AdminLoading label={t('loading')} />;
  if (query.error) return <AdminError error={query.error} onRetry={() => void query.refetch()} />;

  const items = query.data ?? [];
  const save = async (id: string) => {
    const stock = Number(drafts[id]);
    if (!Number.isInteger(stock) || stock < 0) {
      toast({ title: t('toast.invalid'), variant: 'destructive' });
      return;
    }
    try {
      await update.mutateAsync({ id, data: { stock } });
      toast({ title: t('toast.updated'), variant: 'success' });
      setDrafts((current) => ({ ...current, [id]: '' }));
    } catch (error) {
      toast({
        title: t('toast.failed'),
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.variantId}
                className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
              >
                <div>
                  <p className="font-medium">{item.productTitle}</p>
                  <p className="text-xs text-muted-foreground">{item.sku || item.variantId}</p>
                </div>
                <p className={`text-sm font-semibold ${item.stock < 5 ? 'text-destructive' : ''}`}>
                  {t('available', { count: item.stock })}
                </p>
                <div className="flex gap-2">
                  <Input
                    aria-label={t('stockFor', { title: item.productTitle })}
                    className="w-24"
                    inputMode="numeric"
                    placeholder={String(item.stock)}
                    value={drafts[item.variantId] ?? ''}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [item.variantId]: event.target.value }))
                    }
                  />
                  <Button
                    size="sm"
                    onClick={() => void save(item.variantId)}
                    disabled={update.isPending}
                  >
                    {tCommon('save')}
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">{t('empty')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
