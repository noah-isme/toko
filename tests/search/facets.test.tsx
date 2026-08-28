import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const catalogApiMock = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getBrands: vi.fn(),
}));

vi.mock('@/lib/api/services/catalog', () => ({ catalogApi: catalogApiMock }));

import { searchApi } from '@/entities/search/api';
import { useSearchFacetsQuery } from '@/entities/search/hooks';

const categories = [
  { id: 'category-fashion', name: 'Fashion', slug: 'fashion' },
  { id: 'category-home', name: 'Home & Living', slug: 'home-living' },
];

const brands = [{ id: 'brand-acme', name: 'Acme', slug: 'acme' }];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function withQueryClient(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('search facets integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    catalogApiMock.getCategories.mockResolvedValue(categories);
    catalogApiMock.getBrands.mockResolvedValue(brands);
  });

  it('maps supported catalog taxonomy into category and brand facets', async () => {
    await expect(
      searchApi.getFacets({ categories: ['FASHION'], brands: ['acme'] }),
    ).resolves.toEqual([
      {
        name: 'categories',
        label: 'Kategori',
        type: 'category',
        multiSelect: true,
        values: [
          { value: 'fashion', label: 'Fashion', count: 0, selected: true },
          { value: 'home-living', label: 'Home & Living', count: 0, selected: false },
        ],
      },
      {
        name: 'brands',
        label: 'Merek',
        type: 'brand',
        multiSelect: true,
        values: [{ value: 'acme', label: 'Acme', count: 0, selected: true }],
      },
    ]);

    expect(catalogApiMock.getCategories).toHaveBeenCalledOnce();
    expect(catalogApiMock.getBrands).toHaveBeenCalledOnce();
  });

  it('loads taxonomy even when no search filter is active', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useSearchFacetsQuery({}), {
      wrapper: withQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(catalogApiMock.getCategories).toHaveBeenCalledOnce();
    expect(catalogApiMock.getBrands).toHaveBeenCalledOnce();
  });

  it('propagates catalog failures so the filter panel can show recovery UI', async () => {
    catalogApiMock.getCategories.mockRejectedValueOnce(new Error('catalog unavailable'));

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useSearchFacetsQuery({}), {
      wrapper: withQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('catalog unavailable'));
  });
});
