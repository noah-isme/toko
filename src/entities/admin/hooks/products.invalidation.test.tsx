/**
 * Single-product writes must refresh the same caches as bulk catalog writes:
 * the inventory list and the dashboard low/out-of-stock cards read stock too.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateAdminProduct,
  useDeleteAdminProduct,
  useUpdateAdminProduct,
  useUpdateAdminProductStock,
} from './products';

const api = vi.hoisted(() => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  updateProductStock: vi.fn(),
}));
vi.mock('../api', () => ({ adminApi: api }));

const CATALOG_KEYS = [
  ['admin', 'products'],
  ['admin', 'product'],
  ['admin', 'inventory'],
  ['admin', 'analytics'],
];

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { invalidate, wrapper };
}

function invalidatedKeys(invalidate: ReturnType<typeof setup>['invalidate']) {
  return invalidate.mock.calls.map(([filters]) => filters?.queryKey);
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockResolvedValue({ data: null });
});

afterEach(() => vi.clearAllMocks());

describe('admin product mutations', () => {
  it('quick stock edit refreshes inventory and dashboard counts', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useUpdateAdminProductStock(), { wrapper });
    await act(() => result.current.mutateAsync({ id: 'p1', stock: 3, inStock: true }));
    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining(CATALOG_KEYS));
  });

  it('create, update and delete refresh inventory and dashboard counts', async () => {
    const { invalidate, wrapper } = setup();
    const create = renderHook(() => useCreateAdminProduct(), { wrapper });
    await act(() => create.result.current.mutateAsync({} as never));
    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining(CATALOG_KEYS));

    invalidate.mockClear();
    const update = renderHook(() => useUpdateAdminProduct(), { wrapper });
    await act(() => update.result.current.mutateAsync({ id: 'p1', data: {} as never }));
    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining(CATALOG_KEYS));

    invalidate.mockClear();
    const remove = renderHook(() => useDeleteAdminProduct(), { wrapper });
    await act(() => remove.result.current.mutateAsync('p1'));
    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining(CATALOG_KEYS));
  });
});
