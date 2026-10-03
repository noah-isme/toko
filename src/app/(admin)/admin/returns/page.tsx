'use client';

import { useState } from 'react';

import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useAdminReturns,
  useRefundAdminReturn,
  useUpdateAdminReturn,
} from '@/entities/admin/hooks';
import type { ReturnStatus } from '@/entities/admin/types';

const statuses: ReturnStatus[] = ['APPROVED', 'REJECTED', 'RECEIVED', 'CANCELLED'];

export default function AdminReturnsPage() {
  const returnsQuery = useAdminReturns();
  const updateReturn = useUpdateAdminReturn();
  const refundReturn = useRefundAdminReturn();
  const [error, setError] = useState<string | null>(null);
  const items = returnsQuery.data ?? [];
  const update = async (id: string, status: ReturnStatus) => {
    try {
      await updateReturn.mutateAsync({ id, status });
    } catch {
      setError('Gagal memperbarui status.');
    }
  };
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Returns"
        description="Review customer return requests and refund eligibility"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {returnsQuery.isPending ? (
        <AdminLoading />
      ) : returnsQuery.isError ? (
        <AdminError error={returnsQuery.error} onRetry={() => void returnsQuery.refetch()} />
      ) : items.length === 0 ? (
        <AdminEmpty message="No return requests." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">Order {item.orderId}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.reason}
                    {item.notes ? ` — ${item.notes}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.status} • {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={status === item.status ? 'default' : 'outline'}
                      disabled={status === item.status}
                      onClick={() => void update(item.id, status)}
                    >
                      {status}
                    </Button>
                  ))}
                  {(item.status === 'APPROVED' || item.status === 'RECEIVED') && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await refundReturn.mutateAsync(item.id);
                        } catch {
                          setError('Refund gagal.');
                        }
                      }}
                    >
                      Refund
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
