import type {
  AdminOrderExportParams,
  AdminProductExportParams,
  BulkPriceItem,
  BulkPriceResultItem,
  BulkResult,
  BulkStatusItem,
  BulkStatusResultItem,
  BulkStockItem,
  BulkStockResultItem,
  ImportResult,
  ImportType,
} from '../types';

import { buildQuery } from './query';

import { ApiClientError, apiClient, apiDownload } from '@/lib/api/apiClient';
import type { ApiResponse } from '@/lib/api/types';
import { parseContentDispositionFilename, saveBlob } from '@/lib/download';

/** Upper bound the backend enforces on the import file (5 MiB). */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

/** Upper bound the backend enforces on bulk requests. */
export const BULK_MAX_ITEMS = 500;

/** The backend naming scheme (`products-YYYYMMDD-HHMMSS.csv`), used when the header is unreadable. */
export function exportFilename(kind: 'products' | 'orders', now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  const time = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  return `${kind}-${date}-${time}.csv`;
}

async function bulk<TItem, TResult>(
  kind: 'price' | 'stock' | 'status',
  items: TItem[],
): Promise<BulkResult<TResult>> {
  const response = await apiClient<ApiResponse<BulkResult<TResult>>>(
    `/admin/products/bulk/${kind}`,
    { method: 'POST', body: JSON.stringify({ items }), requiresAuth: true },
  );
  return response.data;
}

async function downloadCsv(kind: 'products' | 'orders', params: object): Promise<string> {
  const { blob, contentDisposition } = await apiDownload(
    `/admin/${kind}/export${buildQuery(params)}`,
    { requiresAuth: true, accept: 'text/csv' },
  );
  const filename = parseContentDispositionFilename(contentDisposition) ?? exportFilename(kind);
  saveBlob(blob, filename);
  return filename;
}

function isImportResult(value: unknown): value is ImportResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ImportResult).rows) &&
    typeof (value as ImportResult).summary === 'object'
  );
}

export const adminCatalogOpsApi = {
  /** All-or-nothing; a 422 carries `details.rows` (see `BulkRowError`). */
  bulkUpdatePrice(items: BulkPriceItem[]) {
    return bulk<BulkPriceItem, BulkPriceResultItem>('price', items);
  },

  bulkUpdateStock(items: BulkStockItem[]) {
    return bulk<BulkStockItem, BulkStockResultItem>('stock', items);
  },

  bulkUpdateStatus(items: BulkStatusItem[]) {
    return bulk<BulkStatusItem, BulkStatusResultItem>('status', items);
  },

  /**
   * Downloads the products CSV for the given filters (no pagination) and saves
   * it. The file keeps the server bytes, UTF-8 BOM included. Returns the filename.
   */
  exportProductsCsv(params: AdminProductExportParams = {}) {
    return downloadCsv('products', params);
  },

  exportOrdersCsv(params: AdminOrderExportParams = {}) {
    return downloadCsv('orders', params);
  },

  /**
   * Uploads a CSV for a dry run (default) or a commit. Rejected rows come back
   * as 422 VALIDATION_FAILED whose `details` is the same ImportResult; that is
   * returned rather than thrown so the preview can show every row error.
   * Nothing is written when any row is rejected, in either mode.
   */
  async importProductsCsv(file: File, type: ImportType, dryRun: boolean): Promise<ImportResult> {
    const body = new FormData();
    body.append('file', file, file.name);
    try {
      const response = await apiClient<ApiResponse<ImportResult>>(
        `/admin/products/import${buildQuery({ type, dryRun })}`,
        { method: 'POST', body, requiresAuth: true },
      );
      return response.data;
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.status === 422 &&
        error.code === 'VALIDATION_FAILED' &&
        isImportResult(error.details)
      ) {
        return error.details;
      }
      throw error;
    }
  },
};
