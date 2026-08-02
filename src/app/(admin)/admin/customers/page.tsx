'use client';

import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminCustomers } from '@/lib/api/hooks.admin';

export default function CustomersPage() {
  const query = useAdminCustomers();
  if (query.isLoading) return <AdminLoading label="Loading customers…" />;
  if (query.error) return <AdminError error={query.error} onRetry={() => void query.refetch()} />;
  const customers = query.data ?? [];
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Customers" description="Customers with activity in this store." />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {customers.map((customer) => (
              <div key={customer.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-medium">{customer.name}</p><p className="text-sm text-muted-foreground">{customer.email}</p></div>
                <p className="text-xs text-muted-foreground">Joined {new Date(customer.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
            {customers.length === 0 && <p className="p-6 text-sm text-muted-foreground">No customers found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
