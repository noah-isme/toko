import { apiClient } from '@/lib/api/apiClient';
import { productListSchema } from '@/lib/api/schemas';
import { isMock } from '@/shared/config/isMock';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const isMocked = isMock();

  if (isMocked) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Health check</h1>
        <p className="text-sm text-muted-foreground">
          Mock API is active. Connectivity assumed healthy.
        </p>
        <pre className="overflow-auto rounded-lg border bg-muted/30 p-4 text-xs">
          {JSON.stringify({ status: 'ok', source: 'msw' }, null, 2)}
        </pre>
      </div>
    );
  }

  try {
    const products = await apiClient('/products', { schema: productListSchema, cache: 'no-store' });
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Health check</h1>
        <p className="text-sm text-muted-foreground">Backend connectivity is healthy.</p>
        <pre className="overflow-auto rounded-lg border bg-muted/30 p-4 text-xs">
          {JSON.stringify({ status: 'ok', products: products.length }, null, 2)}
        </pre>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Health check</h1>
        <p className="text-sm text-destructive-foreground">Failed to reach backend.</p>
        <pre className="overflow-auto rounded-lg border bg-destructive/10 p-4 text-xs text-destructive">
          {JSON.stringify({ status: 'error', message: (error as Error).message }, null, 2)}
        </pre>
      </div>
    );
  }
}
