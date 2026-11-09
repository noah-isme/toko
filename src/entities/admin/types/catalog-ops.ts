/**
 * Catalog operations DTOs: bulk price/stock/status, CSV export and CSV import
 * (`docs/contracts/admin.md` 6.21-6.27 in toko-api).
 *
 * The type-level assertions at the bottom bind these hand-written shapes to the
 * generated OpenAPI schema, so a backend rename fails `pnpm typecheck`.
 */
import type { AdminProductStatus, AdminStockStatus } from './products';

import type { components } from '@/lib/api/generated/schema';

// ---------------------------------------------------------------------------
// Bulk updates (all-or-nothing, 1..500 items)
// ---------------------------------------------------------------------------

/** `both` (default) also sets every variant price; `product` changes only the listing price. */
export type BulkPriceApplyTo = 'both' | 'product' | 'variants';

/** The client always sends `applyTo` explicitly rather than relying on the server default. */
export type BulkPriceItem =
  | { productId: string; price: number; compareAt?: number | null; applyTo: BulkPriceApplyTo }
  | { variantId: string; price: number };

export type BulkStockItem =
  | { variantId: string; stock: number }
  | { variantId: string; delta: number };

export interface BulkStatusItem {
  productId: string;
  status: AdminProductStatus;
}

export type BulkRowErrorCode =
  | 'MISSING'
  | 'AMBIGUOUS'
  | 'INVALID_UUID'
  | 'NEGATIVE'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'INVALID_STATUS'
  | 'INVALID_APPLY_TO'
  | 'NEGATIVE_RESULT'
  | 'OUT_OF_RANGE'
  | 'NOT_ALLOWED';

/** One rejected item of a 422 `VALIDATION_FAILED` bulk response. */
export interface BulkRowError {
  /** Zero-based position in the request `items`. */
  index: number;
  field: string;
  code: BulkRowErrorCode;
  message: string;
}

export interface BulkResult<TItem> {
  /** Items that changed at least one value. */
  updated: number;
  items: TItem[];
}

export type BulkPriceResultItem =
  | {
      productId: string;
      slug: string;
      price: number;
      compareAt: number | null;
      applyTo: BulkPriceApplyTo;
      variantsUpdated: number;
    }
  | { variantId: string; productId: string; sku: string | null; price: number };

export interface BulkStockResultItem {
  variantId: string;
  productId: string;
  sku: string | null;
  stock: number;
  inStock: boolean | null;
}

export interface BulkStatusResultItem {
  productId: string;
  slug: string;
  status: AdminProductStatus;
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export interface AdminProductExportParams {
  search?: string;
  category?: string;
  brand?: string;
  inStock?: boolean;
  status?: AdminProductStatus;
  stockStatus?: AdminStockStatus;
}

export interface AdminOrderExportParams {
  status?: string;
  search?: string;
  /** UTC date, inclusive. */
  startDate?: string;
  /** UTC date, exclusive. */
  endDate?: string;
}

// ---------------------------------------------------------------------------
// CSV import (dry run, then commit)
// ---------------------------------------------------------------------------

export type ImportType = 'products' | 'stock';

export type ImportAction = 'create' | 'create_variant' | 'update' | 'unchanged' | 'reject';

export type ImportRowErrorCode = components['schemas']['ImportRow']['errors'][number]['code'];

export interface ImportRowError {
  field: string;
  code: ImportRowErrorCode;
  message: string;
}

export interface ImportRow {
  /** Spreadsheet row number (header is row 1, blank rows count). */
  row: number;
  sku: string;
  variantId?: string;
  productId?: string;
  slug?: string;
  action: ImportAction;
  /** field -> {from, to}; values are raw JSON (numbers, strings, null, objects). */
  changes: Record<string, { from?: unknown; to?: unknown }>;
  errors: ImportRowError[];
}

export interface ImportSummary {
  total: number;
  create: number;
  createVariant: number;
  update: number;
  unchanged: number;
  rejected: number;
}

export interface ImportResult {
  dryRun: boolean;
  type: ImportType;
  summary: ImportSummary;
  rows: ImportRow[];
}

// ---------------------------------------------------------------------------
// Conformance with the generated wire types
// ---------------------------------------------------------------------------

type Wire = components['schemas'];
type Expect<T extends true> = T;
type IsAssignable<A, B> = [A] extends [B] ? true : false;

type _BulkRowErrorMatches = Expect<IsAssignable<Wire['BulkRowError'], BulkRowError>>;
type _BulkPriceItemSatisfiesWire = Expect<IsAssignable<BulkPriceItem, Wire['BulkPriceItem']>>;
type _BulkStockItemSatisfiesWire = Expect<
  IsAssignable<BulkStockItem, Wire['BulkStockRequest']['items'][number]>
>;
type _BulkStatusItemSatisfiesWire = Expect<
  IsAssignable<BulkStatusItem, Wire['BulkStatusRequest']['items'][number]>
>;
type _ImportResultSatisfiesClient = Expect<IsAssignable<Wire['ImportResult'], ImportResult>>;
type _ProductStatusMatches = Expect<
  IsAssignable<NonNullable<Wire['AdminProduct']['status']>, AdminProductStatus>
>;
type _StockStatusMatches = Expect<
  IsAssignable<NonNullable<Wire['AdminProduct']['stockStatus']>, AdminStockStatus>
>;
