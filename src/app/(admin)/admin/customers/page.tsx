'use client';

import { useTranslations } from 'next-intl';

import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminCustomers } from '@/entities/admin/hooks';
import { useAdminFormat } from '@/entities/admin/use-admin-format';

export default function CustomersPage() {
  const t = useTranslations('admin.customers');
  const { day } = useAdminFormat();
  const query = useAdminCustomers();
  if (query.isLoading) return <AdminLoading label={t('loading')} />;
  if (query.error) return <AdminError error={query.error} onRetry={() => void query.refetch()} />;
  const customers = query.data ?? [];
  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('joined', { date: day(customer.createdAt) })}
                </p>
              </div>
            ))}
            {customers.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">{t('empty')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
