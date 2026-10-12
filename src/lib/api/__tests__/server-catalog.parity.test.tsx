import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useProduct, useProducts } from '@/entities/catalog/hooks';
import { productApiParamsFromSearchParams } from '@/entities/search/lib/apiParams';
import { serverCatalogApi } from '@/lib/api/server-catalog';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

/**
 * Server prefetch (in-process mock via serverApiGet) and the client hooks
 * (apiClient -> MSW, which serves the same fixtures/resolvers) must produce
 * deep-equal data, or hydration would show different content than a refetch.
 */
describe('server-prefetched catalog data matches the client hooks', () => {
  it.each(['', 'q=pro', 'sort=price-desc&page=1'])('products for ?%s', async (search) => {
    const params = productApiParamsFromSearchParams(new URLSearchParams(search));
    const server = await serverCatalogApi.getProducts(params);

    const { result } = renderHook(() => useProducts(params), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(server.data.length).toBeGreaterThan(0);
    expect(result.current.data).toEqual(server);
  });

  it('product detail', async () => {
    const server = await serverCatalogApi.getProduct('macbook-pro-14-m3');

    const { result } = renderHook(() => useProduct('macbook-pro-14-m3'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(server.slug).toBe('macbook-pro-14-m3');
    expect(result.current.data).toEqual(server);
  });
});
