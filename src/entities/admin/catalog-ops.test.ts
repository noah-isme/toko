import { describe, expect, it } from 'vitest';

import { exportFilename } from './api/catalog-ops';
import { bulkRowErrors, groupRowErrorsByProduct, isRetryableConflict } from './catalog-errors';
import { nextSort, parseProductListState, productListSearch } from './product-list-params';

import { ApiClientError } from '@/lib/api/apiClient';

describe('product list URL state', () => {
  it('parses valid values and drops invalid ones', () => {
    expect(
      parseProductListState(
        new URLSearchParams('q=kopi&page=3&sort=price:desc&status=draft&stockStatus=low'),
      ),
    ).toEqual({
      q: 'kopi',
      page: 3,
      sort: { field: 'price', direction: 'desc' },
      status: 'draft',
      stockStatus: 'low',
    });
    expect(
      parseProductListState(new URLSearchParams('page=-2&sort=colour&status=x&stockStatus=few')),
    ).toEqual({ q: '', page: 1, sort: undefined, status: undefined, stockStatus: undefined });
    expect(parseProductListState(new URLSearchParams('sort=updated')).sort).toEqual({
      field: 'updated',
      direction: 'desc',
    });
  });

  it('serialises without defaults and round-trips', () => {
    expect(productListSearch({ q: '', page: 1 })).toBe('');
    const search = productListSearch({
      q: 'teh manis',
      page: 2,
      sort: { field: 'name', direction: 'asc' },
      stockStatus: 'out',
    });
    expect(search).toBe('q=teh+manis&page=2&sort=name%3Aasc&stockStatus=out');
    expect(parseProductListState(new URLSearchParams(search)).q).toBe('teh manis');
  });

  it('toggles sort direction on repeated clicks', () => {
    expect(nextSort(undefined, 'price')).toEqual({ field: 'price', direction: 'asc' });
    expect(nextSort({ field: 'price', direction: 'asc' }, 'price').direction).toBe('desc');
    expect(nextSort({ field: 'price', direction: 'desc' }, 'created')).toEqual({
      field: 'created',
      direction: 'desc',
    });
  });
});

describe('catalog errors', () => {
  const rows = [
    { index: 0, field: 'delta', code: 'NEGATIVE_RESULT', message: 'stock would become -2' },
    { index: 2, field: 'variantId', code: 'NOT_FOUND', message: 'variant not found' },
    { index: 9, field: 'variantId', code: 'NOT_FOUND', message: 'variant not found' },
  ];
  const validation = new ApiClientError('invalid', 'VALIDATION_FAILED', 422, { rows });

  it('reads 422 item errors and maps them to products', () => {
    expect(bulkRowErrors(validation)).toEqual(rows);
    expect(bulkRowErrors(new ApiClientError('x', 'BAD_REQUEST', 400))).toBeNull();
    expect(bulkRowErrors(new Error('x'))).toBeNull();

    const grouped = groupRowErrorsByProduct(rows as never, ['p1', 'p1', 'p2']);
    expect(grouped.byProduct.get('p1')?.map((r) => r.index)).toEqual([0]);
    expect(grouped.byProduct.get('p2')?.map((r) => r.index)).toEqual([2]);
    expect(grouped.unmatched.map((r) => r.index)).toEqual([9]);
  });

  it('recognises the retryable conflict only', () => {
    expect(isRetryableConflict(new ApiClientError('busy', 'CONFLICT', 409))).toBe(true);
    expect(isRetryableConflict(new ApiClientError('gone', 'PRODUCT_UNAVAILABLE', 409))).toBe(false);
    expect(isRetryableConflict(validation)).toBe(false);
  });

  it('names exports like the backend', () => {
    expect(exportFilename('products', new Date('2026-10-25T07:08:09Z'))).toBe(
      'products-20261025-070809.csv',
    );
  });
});
