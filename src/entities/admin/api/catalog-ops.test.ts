// @vitest-environment node
/** The catalog-ops API client against the shared mock resolvers (through MSW). */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { adminCatalogOpsApi } from './catalog-ops';

import { ApiClientError, setAccessToken } from '@/lib/api/apiClient';
import { MOCK_ADMIN_TOKEN, adminProducts } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/resolvers/session';

const product = adminProducts[0];
const sku = product.variants[0].sku as string;

beforeEach(() => {
  resetMockState();
  setAccessToken(MOCK_ADMIN_TOKEN);
});

afterEach(() => setAccessToken(null));

describe('adminCatalogOpsApi', () => {
  it('uploads a CSV as multipart and returns the dry run', async () => {
    const file = new File([`sku,stock\r\n${sku},7\r\n`], 'stock.csv', { type: 'text/csv' });
    const result = await adminCatalogOpsApi.importProductsCsv(file, 'stock', true);
    expect(result).toMatchObject({
      dryRun: true,
      type: 'stock',
      summary: { total: 1, update: 1, rejected: 0 },
      rows: [{ row: 2, sku, action: 'update', changes: { stock: { from: 20, to: 7 } } }],
    });
  });

  it('returns the rejected rows of a 422 instead of throwing', async () => {
    const file = new File(['sku,stock\r\nNOPE,1\r\n'], 'stock.csv', { type: 'text/csv' });
    const result = await adminCatalogOpsApi.importProductsCsv(file, 'stock', false);
    expect(result.dryRun).toBe(false);
    expect(result.summary.rejected).toBe(1);
    expect(result.rows[0].errors[0].code).toBe('UNKNOWN_SKU');
  });

  it('throws header problems as API errors with details', async () => {
    const file = new File(['sku,colour\r\nA,red\r\n'], 'p.csv', { type: 'text/csv' });
    await expect(
      adminCatalogOpsApi.importProductsCsv(file, 'products', true),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_HEADER', details: { header: 'colour' } });
  });

  it('throws bulk 422s with the per-item rows', async () => {
    const error = await adminCatalogOpsApi
      .bulkUpdateStatus([{ productId: 'missing', status: 'draft' }])
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).details?.rows).toEqual([
      { index: 0, field: 'productId', code: 'NOT_FOUND', message: 'product not found' },
    ]);
    const ok = await adminCatalogOpsApi.bulkUpdateStock([
      { variantId: product.variants[0].id, delta: 1 },
    ]);
    expect(ok.items[0].stock).toBe(21);
  });
});
