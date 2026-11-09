/**
 * Pure helpers for catalog-operation errors: map a bulk 422 back to the
 * products the items came from, and recognise the retryable 409.
 */
import type { BulkRowError } from './types';

import { ApiClientError } from '@/lib/api/apiClient';

/** The per-item errors of a 422 `VALIDATION_FAILED` bulk response, else null. */
export function bulkRowErrors(error: unknown): BulkRowError[] | null {
  if (!(error instanceof ApiClientError) || error.status !== 422) return null;
  const rows = error.details?.rows;
  if (!Array.isArray(rows)) return null;
  return rows.filter(
    (row): row is BulkRowError =>
      typeof row === 'object' &&
      row !== null &&
      Number.isInteger(row.index) &&
      typeof row.code === 'string',
  );
}

/**
 * Groups item errors by the product each request item was built from.
 * `itemProductIds[i]` is the product of request item `i` (several stock items
 * can belong to one product). Errors whose index has no product are returned
 * under `unmatched`.
 */
export function groupRowErrorsByProduct(
  rows: BulkRowError[],
  itemProductIds: readonly string[],
): { byProduct: Map<string, BulkRowError[]>; unmatched: BulkRowError[] } {
  const byProduct = new Map<string, BulkRowError[]>();
  const unmatched: BulkRowError[] = [];
  for (const row of rows) {
    const productId = itemProductIds[row.index];
    if (!productId) {
      unmatched.push(row);
      continue;
    }
    const list = byProduct.get(productId) ?? [];
    list.push(row);
    byProduct.set(productId, list);
  }
  return { byProduct, unmatched };
}

/**
 * 409 CONFLICT from a catalog write or import: a lock timeout or deadlock with
 * a concurrent change. Nothing was committed, so the same request can be retried.
 */
export function isRetryableConflict(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 409 && error.code === 'CONFLICT';
}

/** The API error code and details, when the error came from the API. */
export function apiErrorInfo(
  error: unknown,
): { code: string; status: number; details: Record<string, unknown> } | null {
  if (!(error instanceof ApiClientError)) return null;
  return { code: error.code, status: error.status, details: error.details ?? {} };
}
