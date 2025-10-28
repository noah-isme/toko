import { Suspense } from 'react';

import OrdersPageClient, { OrdersTableSkeleton } from './orders-page-client';

function OrdersPageFallback() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Pesanan Saya</h1>
          <p className="text-sm text-muted-foreground">Pantau riwayat dan status pesanan Anda.</p>
        </div>
      </div>
      <OrdersTableSkeleton />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageFallback />}>
      <OrdersPageClient />
    </Suspense>
  );
}
