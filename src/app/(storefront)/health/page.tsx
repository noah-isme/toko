import { getTranslations } from 'next-intl/server';

import { apiClient } from '@/lib/api/apiClient';
import { productListSchema } from '@/lib/api/schemas';
import { isMock } from '@/shared/config/isMock';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const t = await getTranslations('common.health');
  const isMocked = isMock();

  if (isMocked) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('mock')}</p>
        <pre className="overflow-auto rounded-lg border bg-muted/30 p-4 text-xs">
          {JSON.stringify({ status: 'ok', source: 'msw' }, null, 2)}
        </pre>
      </div>
    );
  }

  let result: { products: unknown[] } | { error: Error };

  try {
    const products = await apiClient('/products', { schema: productListSchema, cache: 'no-store' });
    result = { products };
  } catch (error) {
    result = { error: error as Error };
  }

  if ('error' in result) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-destructive-foreground">{t('failed')}</p>
        <pre className="overflow-auto rounded-lg border bg-destructive/10 p-4 text-xs text-destructive">
          {JSON.stringify({ status: 'error', message: result.error.message }, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('healthy')}</p>
      <pre className="overflow-auto rounded-lg border bg-muted/30 p-4 text-xs">
        {JSON.stringify({ status: 'ok', products: result.products.length }, null, 2)}
      </pre>
    </div>
  );
}
