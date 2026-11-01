/**
 * Mock catalog operations (toko-api contract `docs/contracts/admin.md` 6.20-6.27):
 * product status and low-stock classification, inventory filters, the
 * store-wide threshold in settings, bulk price/stock/status, CSV export and
 * the dry-run CSV import. Pure functions over the per-session admin store, used
 * by `resolvers/admin.ts` (and so by both the `/api/v1` route and MSW).
 *
 * The validation mirrors the backend's codes and all-or-nothing behaviour
 * closely enough for the UI; it is not a full port (UUID shape checks and
 * cross-row product-value conflicts are not modelled).
 */
import { stableUuid } from '../factories/product';
import { brands, categories } from '../fixtures';

import { CsvParseError, parseCsv, toCsv, unescapeFormula, type CsvCell } from './catalog-csv';
import { sessionValue, type AdminStore } from './session';
import type { MockResult } from './types';

import type {
  AdminOrderDetail,
  AdminProductDetail,
  AdminProductStatus,
  AdminStockStatus,
  BulkRowError,
  ImportResult,
  ImportRow,
  ImportRowError,
} from '@/entities/admin/types';

type Settings = Record<string, unknown>;
type Row = AdminProductDetail;
type Variant = Row['variants'][number];

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const MAX_THRESHOLD = 1_000_000;
const MAX_STOCK = 2_147_483_647;
const BULK_MAX_ITEMS = 500;
const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const IMPORT_MAX_ROWS = 5000;
const PRODUCT_STATUSES: AdminProductStatus[] = ['draft', 'published', 'archived'];
const STOCK_STATUSES: AdminStockStatus[] = ['in', 'low', 'out'];

const badRequest = (message: string, code = 'BAD_REQUEST', details?: object) => ({
  status: 400,
  error: { code, message, ...(details ? { details } : {}) },
});

// ---------------------------------------------------------------------------
// Settings and low-stock classification (6.26)
// ---------------------------------------------------------------------------

export function adminSettings(sessionId: string): Settings {
  return sessionValue<Settings>('adminSettings', sessionId, () => ({}));
}

function storeThreshold(settings: Settings): number {
  const inventory = settings.inventory as { lowStockThreshold?: unknown } | undefined;
  const value = inventory?.lowStockThreshold;
  return typeof value === 'number' ? value : DEFAULT_LOW_STOCK_THRESHOLD;
}

export function effectiveThreshold(product: Row, settings: Settings): number {
  return product.lowStockThreshold ?? storeThreshold(settings);
}

/** `out` at 0, `low` at 1..threshold (a 0 threshold never reports low), `in` above. */
export function classifyStock(stock: number, threshold: number): AdminStockStatus {
  if (stock <= 0) return 'out';
  if (threshold > 0 && stock <= threshold) return 'low';
  return 'in';
}

function productStockStatus(product: Row, settings: Settings): AdminStockStatus {
  if (product.variants.length === 0) return product.inStock ? 'in' : 'out';
  return classifyStock(product.stock, effectiveThreshold(product, settings));
}

/** Adds the catalog-ops fields every AdminProduct response carries. */
export function decorateProduct<T extends Row | Omit<Row, 'images' | 'specs' | 'variants'>>(
  product: T,
  source: Row,
  settings: Settings,
): T {
  return {
    ...product,
    status: source.status ?? 'published',
    stockStatus: productStockStatus(source, settings),
    lowStockThreshold: source.lowStockThreshold ?? null,
  };
}

/** Product stock is the sum of its variants; `inStock` follows it. */
export function syncProductStock(product: Row) {
  if (product.variants.length === 0) return;
  product.stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  product.inStock = product.stock > 0;
}

function isThreshold(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_THRESHOLD;
}

/** Validates `status` / `lowStockThreshold` on product create and PATCH. */
export function validateProductCatalogFields(input: Record<string, unknown>): MockResult | null {
  if (input.status !== undefined && !PRODUCT_STATUSES.includes(input.status as never)) {
    return badRequest('status must be draft, published or archived');
  }
  if (
    input.lowStockThreshold !== undefined &&
    input.lowStockThreshold !== null &&
    !isThreshold(input.lowStockThreshold)
  ) {
    return badRequest(`lowStockThreshold must be between 0 and ${MAX_THRESHOLD}`);
  }
  return null;
}

export function resolveSettings(settings: Settings, method: string, body: unknown): MockResult {
  if (method === 'GET') return { data: settings };
  if (method !== 'PATCH' && method !== 'PUT') return { status: 405 };
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return badRequest('settings must be an object');
  }
  const patch = body as Settings;
  if ('inventory' in patch) {
    const inventory = patch.inventory as Record<string, unknown> | null;
    if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) {
      return badRequest('inventory must be an object');
    }
    if ('lowStockThreshold' in inventory && !isThreshold(inventory.lowStockThreshold)) {
      return badRequest(
        `inventory.lowStockThreshold must be an integer between 0 and ${MAX_THRESHOLD}`,
      );
    }
  }
  // Each top-level key replaces the stored document for that key.
  Object.assign(settings, structuredClone(patch));
  return { data: settings };
}

// ---------------------------------------------------------------------------
// Product list filters and sort (6.20)
// ---------------------------------------------------------------------------

const SORT_FIELDS = ['name', 'price', 'stock', 'created', 'updated'] as const;

/** Applies `status`, `stockStatus` and `sort`; returns an error result for bad values. */
export function filterAndSortProducts(
  rows: Row[],
  searchParams: URLSearchParams,
  settings: Settings,
): { rows: Row[] } | { error: MockResult } {
  const status = searchParams.get('status');
  const stockStatus = searchParams.get('stockStatus');
  const sort = searchParams.get('sort');
  if (status && !PRODUCT_STATUSES.includes(status as AdminProductStatus)) {
    return { error: badRequest('status must be draft, published or archived') };
  }
  if (stockStatus && !STOCK_STATUSES.includes(stockStatus as AdminStockStatus)) {
    return { error: badRequest('stockStatus must be in, low or out') };
  }
  let result = rows
    .filter((p) => !status || (p.status ?? 'published') === status)
    .filter((p) => !stockStatus || productStockStatus(p, settings) === stockStatus);

  if (sort) {
    const [field, direction] = sort.split(':');
    if (
      !SORT_FIELDS.includes(field as (typeof SORT_FIELDS)[number]) ||
      (direction !== undefined && direction !== 'asc' && direction !== 'desc')
    ) {
      return {
        error: badRequest('sort must be name|price|stock|created|updated with optional :asc|:desc'),
      };
    }
    const desc = direction ? direction === 'desc' : field === 'created' || field === 'updated';
    const value = (p: Row): string | number => {
      switch (field) {
        case 'name':
          return p.title.toLowerCase();
        case 'price':
          return p.price;
        case 'stock':
          return p.stock;
        case 'created':
          return p.createdAt;
        default:
          return p.updatedAt;
      }
    };
    result = [...result].sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      const order = x < y ? -1 : x > y ? 1 : a.id.localeCompare(b.id);
      return desc ? -order : order;
    });
  }
  return { rows: result };
}

// ---------------------------------------------------------------------------
// Inventory (6.26)
// ---------------------------------------------------------------------------

function findVariant(admin: AdminStore, variantId: string) {
  for (const product of admin.products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}

function inventoryRow(product: Row, variant: Variant, settings: Settings) {
  const threshold = effectiveThreshold(product, settings);
  return {
    variantId: variant.id,
    productId: product.id,
    sku: variant.sku ?? null,
    productTitle: product.title,
    price: variant.price,
    stock: variant.stock,
    stockStatus: classifyStock(variant.stock, threshold),
    lowStockThreshold: threshold,
  };
}

export function resolveInventory(
  admin: AdminStore,
  settings: Settings,
  method: string,
  parts: string[],
  body: any,
  searchParams: URLSearchParams,
): MockResult | undefined {
  if (parts.length === 1 && method === 'GET') {
    let filter = (searchParams.get('stockStatus') || '').toLowerCase();
    if (filter && !STOCK_STATUSES.includes(filter as AdminStockStatus)) {
      return badRequest('stockStatus must be in, low or out');
    }
    const lowStock = searchParams.get('lowStock');
    if (lowStock !== null && lowStock !== '') {
      if (lowStock !== 'true' && lowStock !== 'false') {
        return badRequest('lowStock must be true or false');
      }
      if (lowStock === 'true') {
        if (filter && filter !== 'low')
          return badRequest('lowStock=true conflicts with stockStatus');
        filter = 'low';
      }
    }
    const rows = admin.products
      .flatMap((product) => product.variants.map((v) => inventoryRow(product, v, settings)))
      .filter((row) => !filter || row.stockStatus === filter);
    return { data: rows };
  }
  if (parts.length === 2 && method === 'PATCH') {
    const found = findVariant(admin, parts[1]);
    if (!found) return { status: 404, error: { code: 'NOT_FOUND', message: 'variant not found' } };
    const { product, variant } = found;
    const next =
      typeof body?.stock === 'number'
        ? body.stock
        : typeof body?.delta === 'number'
          ? variant.stock + body.delta
          : NaN;
    if (!Number.isInteger(next) || next < 0) return badRequest('stock must be zero or greater');
    variant.stock = next;
    syncProductStock(product);
    product.updatedAt = new Date().toISOString();
    return { data: inventoryRow(product, variant, settings) };
  }
  return undefined;
}

export function stockCounts(admin: AdminStore, settings: Settings) {
  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  for (const product of admin.products) {
    const status = productStockStatus(product, settings);
    if (status === 'low') lowStockProducts += 1;
    if (status === 'out') outOfStockProducts += 1;
  }
  return { lowStockProducts, outOfStockProducts };
}

// ---------------------------------------------------------------------------
// Bulk updates (6.21-6.23)
// ---------------------------------------------------------------------------

function bulkItems(body: any): unknown[] | MockResult {
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) return badRequest('items must not be empty');
  if (items.length > BULK_MAX_ITEMS) {
    return badRequest(`at most ${BULK_MAX_ITEMS} items`, 'TOO_MANY_ROWS', {
      max: BULK_MAX_ITEMS,
      got: items.length,
    });
  }
  return items;
}

function validationFailed(rows: BulkRowError[]): MockResult {
  return {
    status: 422,
    error: {
      code: 'VALIDATION_FAILED',
      message: 'one or more items are invalid; nothing was changed',
      details: { rows },
    },
  };
}

const isPrice = (value: unknown): value is number => Number.isInteger(value);

function checkPrice(
  rows: BulkRowError[],
  index: number,
  field: string,
  value: unknown,
  required: boolean,
) {
  if (value === undefined || value === null) {
    if (required) rows.push({ index, field, code: 'MISSING', message: `${field} is required` });
    return;
  }
  if (!isPrice(value)) {
    rows.push({ index, field, code: 'OUT_OF_RANGE', message: `${field} must be an integer` });
  } else if (value < 0) {
    rows.push({ index, field, code: 'NEGATIVE', message: `${field} must be zero or greater` });
  }
}

export function bulkPrice(admin: AdminStore, body: any): MockResult {
  const items = bulkItems(body);
  if (!Array.isArray(items)) return items;
  const errors: BulkRowError[] = [];
  const plans: (() => object)[] = [];
  const touchedProducts = new Map<string, string>();
  const touchedVariants = new Set<string>();

  items.forEach((raw: any, index) => {
    const before = errors.length;
    const hasProduct = typeof raw?.productId === 'string' && raw.productId !== '';
    const hasVariant = typeof raw?.variantId === 'string' && raw.variantId !== '';
    if (hasProduct && hasVariant) {
      errors.push({
        index,
        field: 'productId',
        code: 'AMBIGUOUS',
        message: 'send productId or variantId, not both',
      });
      return;
    }
    if (!hasProduct && !hasVariant) {
      errors.push({
        index,
        field: 'productId',
        code: 'MISSING',
        message: 'productId or variantId is required',
      });
      return;
    }
    checkPrice(errors, index, 'price', raw.price, true);

    if (hasProduct) {
      const applyTo = raw.applyTo ?? 'both';
      if (!['both', 'product', 'variants'].includes(applyTo)) {
        errors.push({
          index,
          field: 'applyTo',
          code: 'INVALID_APPLY_TO',
          message: 'applyTo must be both, product or variants',
        });
      }
      if (applyTo === 'variants' && raw.compareAt !== undefined) {
        errors.push({
          index,
          field: 'compareAt',
          code: 'NOT_ALLOWED',
          message: 'compareAt is not allowed with applyTo=variants',
        });
      }
      if (raw.compareAt !== undefined) checkPrice(errors, index, 'compareAt', raw.compareAt, false);
      const product = admin.products.find((p) => p.id === raw.productId);
      if (!product) {
        errors.push({ index, field: 'productId', code: 'NOT_FOUND', message: 'product not found' });
        return;
      }
      if (touchedProducts.has(product.id)) {
        errors.push({
          index,
          field: 'productId',
          code: 'DUPLICATE',
          message: 'product appears more than once',
        });
        return;
      }
      touchedProducts.set(product.id, applyTo);
      if (errors.length > before) return;
      plans.push(() => {
        const now = new Date().toISOString();
        let variantsUpdated = 0;
        if (applyTo !== 'variants') {
          product.price = raw.price;
          if (raw.compareAt !== undefined) product.compareAt = raw.compareAt;
        }
        if (applyTo !== 'product') {
          for (const variant of product.variants) {
            if (variant.price !== raw.price) variantsUpdated += 1;
            variant.price = raw.price;
          }
        }
        product.updatedAt = now;
        return {
          productId: product.id,
          slug: product.slug,
          price: product.price,
          compareAt: product.compareAt ?? null,
          applyTo,
          variantsUpdated,
        };
      });
      return;
    }

    const found = findVariant(admin, raw.variantId);
    if (!found) {
      errors.push({ index, field: 'variantId', code: 'NOT_FOUND', message: 'variant not found' });
      return;
    }
    if (touchedVariants.has(raw.variantId)) {
      errors.push({
        index,
        field: 'variantId',
        code: 'DUPLICATE',
        message: 'variant appears more than once',
      });
      return;
    }
    touchedVariants.add(raw.variantId);
    if (errors.length > before) return;
    plans.push(() => {
      found.variant.price = raw.price;
      found.product.updatedAt = new Date().toISOString();
      return {
        variantId: found.variant.id,
        productId: found.product.id,
        sku: found.variant.sku ?? null,
        price: found.variant.price,
      };
    });
  });

  // A variant whose product is also targeted with applyTo both|variants is a duplicate.
  items.forEach((raw: any, index) => {
    if (typeof raw?.variantId !== 'string') return;
    const found = findVariant(admin, raw.variantId);
    const applyTo = found ? touchedProducts.get(found.product.id) : undefined;
    if (applyTo === 'both' || applyTo === 'variants') {
      errors.push({
        index,
        field: 'variantId',
        code: 'DUPLICATE',
        message: "the variant's product is also in this request",
      });
    }
  });

  if (errors.length > 0) return validationFailed(errors.sort((a, b) => a.index - b.index));
  const results = plans.map((apply) => apply());
  return { data: { updated: results.length, items: results } };
}

export function bulkStock(admin: AdminStore, body: any): MockResult {
  const items = bulkItems(body);
  if (!Array.isArray(items)) return items;
  const errors: BulkRowError[] = [];
  const seen = new Set<string>();
  const plans: { product: Row; variant: Variant; next: number }[] = [];

  items.forEach((raw: any, index) => {
    if (typeof raw?.variantId !== 'string' || raw.variantId === '') {
      errors.push({ index, field: 'variantId', code: 'MISSING', message: 'variantId is required' });
      return;
    }
    const hasStock = raw.stock !== undefined && raw.stock !== null;
    const hasDelta = raw.delta !== undefined && raw.delta !== null;
    if (hasStock && hasDelta) {
      errors.push({
        index,
        field: 'stock',
        code: 'AMBIGUOUS',
        message: 'send stock or delta, not both',
      });
      return;
    }
    if (!hasStock && !hasDelta) {
      errors.push({
        index,
        field: 'stock',
        code: 'MISSING',
        message: 'stock or delta is required',
      });
      return;
    }
    const field = hasStock ? 'stock' : 'delta';
    const value = hasStock ? raw.stock : raw.delta;
    if (!Number.isInteger(value)) {
      errors.push({ index, field, code: 'OUT_OF_RANGE', message: `${field} must be an integer` });
      return;
    }
    if (hasStock && value < 0) {
      errors.push({ index, field, code: 'NEGATIVE', message: 'stock must be zero or greater' });
      return;
    }
    const found = findVariant(admin, raw.variantId);
    if (!found) {
      errors.push({ index, field: 'variantId', code: 'NOT_FOUND', message: 'variant not found' });
      return;
    }
    if (seen.has(raw.variantId)) {
      errors.push({
        index,
        field: 'variantId',
        code: 'DUPLICATE',
        message: 'variant appears more than once',
      });
      return;
    }
    seen.add(raw.variantId);
    const next = hasStock ? value : found.variant.stock + value;
    if (next < 0) {
      errors.push({ index, field, code: 'NEGATIVE_RESULT', message: `stock would become ${next}` });
      return;
    }
    if (next > MAX_STOCK) {
      errors.push({ index, field, code: 'OUT_OF_RANGE', message: 'stock is too large' });
      return;
    }
    plans.push({ ...found, next });
  });

  if (errors.length > 0) return validationFailed(errors);
  const changedProducts = new Map<string, boolean>();
  let updated = 0;
  const now = new Date().toISOString();
  const applied = plans.map(({ product, variant, next }) => {
    if (variant.stock !== next) updated += 1;
    variant.stock = next;
    const wasInStock = product.inStock;
    syncProductStock(product);
    product.updatedAt = now;
    if (product.inStock !== wasInStock) changedProducts.set(product.id, product.inStock);
    return { product, variant };
  });
  return {
    data: {
      updated,
      items: applied.map(({ product, variant }) => ({
        variantId: variant.id,
        productId: product.id,
        sku: variant.sku ?? null,
        stock: variant.stock,
        inStock: changedProducts.has(product.id) ? product.inStock : null,
      })),
    },
  };
}

export function bulkStatus(admin: AdminStore, body: any): MockResult {
  const items = bulkItems(body);
  if (!Array.isArray(items)) return items;
  const errors: BulkRowError[] = [];
  const seen = new Set<string>();
  const plans: { product: Row; status: AdminProductStatus }[] = [];
  items.forEach((raw: any, index) => {
    if (typeof raw?.productId !== 'string' || raw.productId === '') {
      errors.push({ index, field: 'productId', code: 'MISSING', message: 'productId is required' });
      return;
    }
    if (!PRODUCT_STATUSES.includes(raw.status)) {
      errors.push({
        index,
        field: 'status',
        code: 'INVALID_STATUS',
        message: 'status must be draft, published or archived',
      });
      return;
    }
    const product = admin.products.find((p) => p.id === raw.productId);
    if (!product) {
      errors.push({ index, field: 'productId', code: 'NOT_FOUND', message: 'product not found' });
      return;
    }
    if (seen.has(product.id)) {
      errors.push({
        index,
        field: 'productId',
        code: 'DUPLICATE',
        message: 'product appears more than once',
      });
      return;
    }
    seen.add(product.id);
    plans.push({ product, status: raw.status });
  });
  if (errors.length > 0) return validationFailed(errors);
  let updated = 0;
  const now = new Date().toISOString();
  const results = plans.map(({ product, status }) => {
    if ((product.status ?? 'published') !== status) updated += 1;
    product.status = status;
    product.updatedAt = now;
    return { productId: product.id, slug: product.slug, status };
  });
  return { data: { updated, items: results } };
}

// ---------------------------------------------------------------------------
// CSV export (6.24, 6.27)
// ---------------------------------------------------------------------------

export const PRODUCT_EXPORT_COLUMNS = [
  'sku',
  'product_id',
  'variant_id',
  'title',
  'slug',
  'status',
  'price',
  'compare_at',
  'variant_price',
  'stock',
  'stock_baseline',
  'low_stock_threshold',
  'in_stock',
  'stock_status',
  'category_slug',
  'brand_slug',
  'description',
  'attributes',
  'created_at',
  'updated_at',
];

export const ORDER_EXPORT_COLUMNS = [
  'order_number',
  'order_id',
  'status',
  'payment_status',
  'customer_name',
  'customer_email',
  'currency',
  'subtotal',
  'discount',
  'tax',
  'shipping',
  'total',
  'voucher_code',
  'items_count',
  'courier',
  'tracking_number',
  'created_at',
  'updated_at',
];

function exportStamp(now = new Date()) {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

const categorySlug = (id?: string | null) => categories.find((c) => c.id === id)?.slug ?? '';
const brandSlug = (id?: string | null) => brands.find((b) => b.id === id)?.slug ?? '';

export function exportProductsCsv(rows: Row[], settings: Settings): MockResult {
  const lines: CsvCell[][] = [];
  for (const product of rows) {
    const shared = {
      title: product.title,
      slug: product.slug,
      status: product.status ?? 'published',
      price: product.price,
      compareAt: product.compareAt ?? null,
      threshold: product.lowStockThreshold ?? null,
      inStock: product.inStock,
      stockStatus: productStockStatus(product, settings),
    };
    const productCells = (variant?: Variant): CsvCell[] => [
      variant?.sku ?? '',
      product.id,
      variant?.id ?? '',
      shared.title,
      shared.slug,
      shared.status,
      shared.price,
      shared.compareAt,
      variant ? variant.price : null,
      variant ? variant.stock : null,
      variant ? variant.stock : null,
      shared.threshold,
      shared.inStock,
      shared.stockStatus,
      categorySlug(product.categoryId),
      brandSlug(product.brandId),
      product.description ?? '',
      variant ? JSON.stringify(variant.attributes ?? {}) : '',
      product.createdAt,
      product.updatedAt,
    ];
    if (product.variants.length === 0) lines.push(productCells());
    else for (const variant of product.variants) lines.push(productCells(variant));
  }
  return {
    file: {
      body: toCsv(PRODUCT_EXPORT_COLUMNS, lines),
      contentType: 'text/csv; charset=utf-8',
      filename: `products-${exportStamp()}.csv`,
    },
  };
}

export function exportOrdersCsv(
  orders: AdminOrderDetail[],
  searchParams: URLSearchParams,
): MockResult {
  const status = searchParams.get('status');
  const search = (searchParams.get('search') || '').toLowerCase();
  const start = searchParams.get('startDate');
  const end = searchParams.get('endDate');
  for (const [name, value] of [
    ['startDate', start],
    ['endDate', end],
  ] as const) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return badRequest(`${name} must be YYYY-MM-DD`);
  }
  const rows = orders
    .filter((o) => !status || status === 'all' || o.status === status)
    .filter(
      (o) =>
        !search ||
        [o.orderNumber, o.customerName, o.customerEmail].some((f) =>
          f?.toLowerCase().includes(search),
        ),
    )
    .filter((o) => !start || o.createdAt.slice(0, 10) >= start)
    .filter((o) => !end || o.createdAt.slice(0, 10) < end)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o): CsvCell[] => {
      const order = o as AdminOrderDetail & Record<string, any>;
      return [
        order.orderNumber ?? '',
        order.id,
        order.status,
        order.paymentStatus ?? '',
        order.customerName ?? '',
        order.customerEmail ?? '',
        order.currency ?? 'IDR',
        order.subtotal ?? null,
        order.discount ?? 0,
        order.tax ?? null,
        order.shipping ?? null,
        order.total,
        order.voucherCode ?? '',
        order.items?.length ?? 0,
        order.shipment?.courier ?? order.courier ?? '',
        order.shipment?.trackingNumber ?? order.trackingNumber ?? '',
        order.createdAt,
        order.updatedAt ?? order.createdAt,
      ];
    });
  return {
    file: {
      body: toCsv(ORDER_EXPORT_COLUMNS, rows),
      contentType: 'text/csv; charset=utf-8',
      filename: `orders-${exportStamp()}.csv`,
    },
  };
}

// ---------------------------------------------------------------------------
// CSV import (6.25)
// ---------------------------------------------------------------------------

const PRODUCT_IMPORT_HEADERS = [...PRODUCT_EXPORT_COLUMNS];
const STOCK_IMPORT_HEADERS = ['sku', 'stock', 'variant_id', 'stock_baseline'];
const IGNORED_HEADERS = new Set(['in_stock', 'stock_status', 'created_at', 'updated_at']);
const CLEARABLE = new Set([
  'compare_at',
  'low_stock_threshold',
  'description',
  'category_slug',
  'brand_slug',
]);

type UploadedFile = { name: string; type: string; size: number; text: string };

type Plan = {
  row: ImportRow;
  apply?: () => void;
};

function intCell(
  value: string,
  field: string,
  errors: ImportRowError[],
  max = MAX_STOCK,
): number | undefined {
  if (!/^-?\d+$/.test(value)) {
    errors.push({ field, code: 'INVALID_NUMBER', message: `${field} must be a whole number` });
    return undefined;
  }
  const parsed = Number(value);
  if (parsed < 0) {
    errors.push({ field, code: 'NEGATIVE', message: `${field} must be zero or greater` });
    return undefined;
  }
  if (parsed > max) {
    errors.push({ field, code: 'OUT_OF_RANGE', message: `${field} is too large` });
    return undefined;
  }
  return parsed;
}

function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Plans (and on commit applies) a products/stock CSV import against the store. */
export function importCsv(admin: AdminStore, body: any, searchParams: URLSearchParams): MockResult {
  const type = searchParams.get('type');
  if (type !== 'products' && type !== 'stock') return badRequest('type must be products or stock');
  const dryRunParam = searchParams.get('dryRun') ?? 'true';
  if (dryRunParam !== 'true' && dryRunParam !== 'false')
    return badRequest('dryRun must be true or false');
  const dryRun = dryRunParam === 'true';

  const file: UploadedFile | undefined = body?.files?.file;
  if (!file) return badRequest('file is required');
  if (file.size > IMPORT_MAX_BYTES) {
    return {
      status: 413,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'file is larger than 5 MiB' },
    };
  }
  if (/\.(xlsx|xlsm|xls)$/i.test(file.name) || file.text.startsWith('PK')) {
    return badRequest('upload a CSV file (.xlsx is not supported)', 'UNSUPPORTED_FILE');
  }
  if (file.text.includes('�')) return badRequest('the file is not UTF-8', 'INVALID_ENCODING');

  let records: { row: number; cells: string[] }[];
  try {
    records = parseCsv(file.text);
  } catch (error) {
    if (error instanceof CsvParseError) {
      return badRequest('the file is not valid CSV', 'INVALID_CSV', { row: error.row });
    }
    throw error;
  }
  const headerRecord = records.shift();
  if (!headerRecord || headerRecord.cells.every((c) => c.trim() === '')) {
    return badRequest('the file is empty', 'EMPTY_FILE');
  }
  const headers = headerRecord.cells.map((h) => h.trim().toLowerCase());
  const allowed = type === 'products' ? PRODUCT_IMPORT_HEADERS : STOCK_IMPORT_HEADERS;
  const required = type === 'products' ? ['sku'] : ['sku', 'stock'];
  const seenHeaders = new Set<string>();
  for (const header of headers) {
    if (!allowed.includes(header))
      return badRequest(`unknown column ${header}`, 'INVALID_HEADER', { header });
    if (seenHeaders.has(header))
      return badRequest(`duplicate column ${header}`, 'DUPLICATE_HEADER', { header });
    seenHeaders.add(header);
  }
  for (const header of required) {
    if (!seenHeaders.has(header))
      return badRequest(`missing column ${header}`, 'MISSING_HEADER', { header });
  }
  const dataRows = records.filter((r) => r.cells.some((c) => c.trim() !== ''));
  if (dataRows.length > IMPORT_MAX_ROWS) {
    return badRequest(`at most ${IMPORT_MAX_ROWS} rows`, 'TOO_MANY_ROWS', {
      max: IMPORT_MAX_ROWS,
      got: dataRows.length,
    });
  }

  const skuIndex = new Map<string, { product: Row; variant: Variant }>();
  for (const product of admin.products) {
    for (const variant of product.variants)
      if (variant.sku) skuIndex.set(variant.sku, { product, variant });
  }
  const fileSkus = new Set<string>();
  const fileVariants = new Set<string>();
  const newProducts = new Map<string, Row>();
  const plans: Plan[] = [];

  for (const record of dataRows) {
    const cell = (name: string): string | undefined => {
      const at = headers.indexOf(name);
      if (at < 0 || IGNORED_HEADERS.has(name)) return undefined;
      return unescapeFormula((record.cells[at] ?? '').trim());
    };
    const errors: ImportRowError[] = [];
    const changes: ImportRow['changes'] = {};
    const sku = cell('sku') ?? '';
    const variantId = cell('variant_id') ?? '';
    const productId = cell('product_id') ?? '';
    const row: ImportRow = { row: record.row, sku, action: 'unchanged', changes, errors };
    plans.push({ row });

    if (sku && fileSkus.has(sku))
      errors.push({ field: 'sku', code: 'DUPLICATE_SKU', message: 'sku appears more than once' });
    if (variantId && fileVariants.has(variantId))
      errors.push({
        field: 'variant_id',
        code: 'DUPLICATE_VARIANT',
        message: 'variant_id appears more than once',
      });
    if (sku) fileSkus.add(sku);
    if (variantId) fileVariants.add(variantId);

    // Resolve identity.
    let product: Row | undefined;
    let variant: Variant | undefined;
    let action: ImportRow['action'] = 'update';
    if (variantId) {
      const found = findVariant(admin, variantId);
      if (!found)
        errors.push({ field: 'variant_id', code: 'UNKNOWN_VARIANT', message: 'variant not found' });
      else {
        ({ product, variant } = found);
        if (sku && variant.sku && sku !== variant.sku) {
          errors.push({
            field: 'sku',
            code: 'SKU_MISMATCH',
            message: `sku differs from the stored ${variant.sku}`,
          });
        } else if (sku && !variant.sku && type === 'stock') {
          errors.push({
            field: 'sku',
            code: 'SKU_MISMATCH',
            message: 'the variant has no sku; leave sku empty or assign one with type=products',
          });
        } else if (sku && !variant.sku && skuIndex.has(sku)) {
          // SKUs are unique per store: one another variant here already has is never free.
          errors.push({
            field: 'sku',
            code: 'SKU_TAKEN',
            message: 'sku is already used by another product',
          });
        }
        if (productId && productId !== product.id) {
          errors.push({
            field: 'product_id',
            code: 'PRODUCT_MISMATCH',
            message: 'variant belongs to another product',
          });
        }
      }
    } else if (sku && skuIndex.has(sku)) {
      ({ product, variant } = skuIndex.get(sku)!);
    } else if (sku) {
      if (type === 'stock')
        errors.push({ field: 'sku', code: 'UNKNOWN_SKU', message: 'sku not found' });
      else if (productId) {
        product = admin.products.find((p) => p.id === productId);
        if (!product)
          errors.push({
            field: 'product_id',
            code: 'UNKNOWN_PRODUCT',
            message: 'product not found',
          });
        action = 'create_variant';
      } else {
        const title = cell('title') ?? '';
        const slug = cell('slug') || slugifyTitle(title);
        product = admin.products.find((p) => p.slug === slug);
        if (product) action = 'create_variant';
        else {
          action = 'create';
          if (!title)
            errors.push({
              field: 'title',
              code: 'MISSING_FOR_CREATE',
              message: 'title is required to create a product',
            });
          if (!cell('price'))
            errors.push({
              field: 'price',
              code: 'MISSING_FOR_CREATE',
              message: 'price is required to create a product',
            });
          row.slug = slug;
        }
      }
    } else if (productId && type === 'products') {
      product = admin.products.find((p) => p.id === productId);
      if (!product)
        errors.push({ field: 'product_id', code: 'UNKNOWN_PRODUCT', message: 'product not found' });
      for (const field of ['variant_price', 'stock']) {
        if (cell(field))
          errors.push({ field, code: 'NO_VARIANT', message: `${field} needs a variant (sku)` });
      }
    } else {
      errors.push({
        field: 'sku',
        code: 'MISSING',
        message: 'sku, variant_id or product_id is required',
      });
    }

    if (product) {
      row.productId = product.id;
      row.slug = product.slug;
    }
    if (variant) row.variantId = variant.id;

    // Product-level fields (products type only).
    const productPatch: Partial<Row> = {};
    if (type === 'products') {
      const textField = (name: string, current: string | null | undefined, key: keyof Row) => {
        const value = cell(name);
        if (value === undefined) return;
        if (value === '' && !CLEARABLE.has(name)) return;
        const next = value === '' ? null : value;
        if ((current ?? null) !== next) {
          changes[name] = { from: action === 'create' ? null : (current ?? null), to: next };
          (productPatch as Record<string, unknown>)[key] = next;
        }
      };
      const numberField = (
        name: string,
        current: number | null | undefined,
        key: keyof Row,
        max?: number,
      ) => {
        const value = cell(name);
        if (value === undefined) return;
        if (value === '' && !CLEARABLE.has(name)) return;
        const next = value === '' ? null : intCell(value, name, errors, max);
        if (next === undefined) return;
        if ((current ?? null) !== next) {
          changes[name] = { from: action === 'create' ? null : (current ?? null), to: next };
          (productPatch as Record<string, unknown>)[key] = next;
        }
      };
      const base = action === 'create' ? undefined : product;
      textField('title', base?.title, 'title');
      const slugCell = cell('slug');
      if (slugCell && base && slugCell !== base.slug) {
        if (admin.products.some((p) => p.slug === slugCell && p !== base)) {
          errors.push({
            field: 'slug',
            code: 'SLUG_TAKEN',
            message: 'slug is used by another product',
          });
        } else {
          changes.slug = { from: base.slug, to: slugCell };
          productPatch.slug = slugCell;
        }
      }
      const status = cell('status');
      if (status) {
        if (!PRODUCT_STATUSES.includes(status as AdminProductStatus)) {
          errors.push({
            field: 'status',
            code: 'INVALID_STATUS',
            message: 'status must be draft, published or archived',
          });
        } else if ((base?.status ?? (base ? 'published' : null)) !== status) {
          changes.status = { from: base ? (base.status ?? 'published') : null, to: status };
          productPatch.status = status as AdminProductStatus;
        }
      }
      numberField('price', base?.price, 'price');
      numberField('compare_at', base?.compareAt, 'compareAt');
      numberField(
        'low_stock_threshold',
        base?.lowStockThreshold,
        'lowStockThreshold',
        MAX_THRESHOLD,
      );
      textField('description', base?.description, 'description');
      const category = cell('category_slug');
      if (category !== undefined) {
        const id = category === '' ? null : categories.find((c) => c.slug === category)?.id;
        if (id === undefined)
          errors.push({
            field: 'category_slug',
            code: 'UNKNOWN_CATEGORY',
            message: 'category not found',
          });
        else if ((base?.categoryId ?? null) !== id) {
          changes.category_slug = {
            from: base ? categorySlug(base.categoryId) || null : null,
            to: category || null,
          };
          productPatch.categoryId = id;
          productPatch.categoryName = categories.find((c) => c.id === id)?.name ?? null;
        }
      }
      const brand = cell('brand_slug');
      if (brand !== undefined) {
        const id = brand === '' ? null : brands.find((b) => b.slug === brand)?.id;
        if (id === undefined)
          errors.push({ field: 'brand_slug', code: 'UNKNOWN_BRAND', message: 'brand not found' });
        else if ((base?.brandId ?? null) !== id) {
          changes.brand_slug = {
            from: base ? brandSlug(base.brandId) || null : null,
            to: brand || null,
          };
          productPatch.brandId = id;
          productPatch.brandName = brands.find((b) => b.id === id)?.name ?? null;
        }
      }
      const attributes = cell('attributes');
      if (attributes) {
        try {
          const parsed: unknown = JSON.parse(attributes);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
            throw new Error('not an object');
        } catch {
          errors.push({
            field: 'attributes',
            code: 'INVALID_JSON',
            message: 'attributes must be a JSON object',
          });
        }
      }
    }

    // Variant-level fields.
    const variantPatch: Partial<Variant> = {};
    const variantPrice = type === 'products' ? cell('variant_price') : undefined;
    if (variantPrice) {
      const next = intCell(variantPrice, 'variant_price', errors);
      if (next !== undefined && (!variant || variant.price !== next)) {
        changes.variant_price = { from: variant?.price ?? null, to: next };
        variantPatch.price = next;
      }
    }
    if (sku && variant && !variant.sku && type === 'products') {
      changes.sku = { from: null, to: sku };
      variantPatch.sku = sku;
    }
    const stockCell = cell('stock');
    if (stockCell) {
      const next = intCell(stockCell, 'stock', errors);
      const baselineCell = cell('stock_baseline');
      const baseline = baselineCell ? intCell(baselineCell, 'stock_baseline', errors) : undefined;
      if (next !== undefined) {
        if (!variant) {
          changes.stock = { from: null, to: next };
          variantPatch.stock = next;
        } else if (baselineCell) {
          if (baseline !== undefined && next !== baseline) {
            if (variant.stock === baseline) {
              changes.stock = { from: variant.stock, to: next };
              variantPatch.stock = next;
            } else if (variant.stock !== next) {
              errors.push({
                field: 'stock',
                code: 'STALE_STOCK',
                message: `stock changed from ${baseline} to ${variant.stock} since the export`,
              });
            }
          }
        } else if (variant.stock !== next) {
          if (type === 'stock') {
            changes.stock = { from: variant.stock, to: next };
            variantPatch.stock = next;
          } else {
            errors.push({
              field: 'stock',
              code: 'STOCK_BASELINE_REQUIRED',
              message:
                'add stock_baseline (from an export) to change the stock of an existing variant',
            });
          }
        }
      }
    }

    if (errors.length > 0) {
      row.action = 'reject';
      continue;
    }
    if (action === 'update' && Object.keys(changes).length === 0) {
      row.action = 'unchanged';
      continue;
    }
    row.action = action;
    const targetProduct = product;
    const targetVariant = variant;
    plans[plans.length - 1].apply = () => {
      const now = new Date().toISOString();
      let owner = targetProduct;
      if (action === 'create') {
        const slug = row.slug as string;
        owner = newProducts.get(slug);
        if (!owner) {
          admin.created += 1;
          const id = stableUuid(`admin-import:${slug}:${admin.created}`);
          owner = {
            id,
            title: '',
            slug,
            price: 0,
            inStock: false,
            stock: 0,
            badges: [],
            variantCount: 0,
            sku: sku || null,
            createdAt: now,
            updatedAt: now,
            images: [],
            specs: [],
            variants: [],
            status: 'published',
          };
          admin.products.unshift(owner);
          newProducts.set(slug, owner);
        }
        row.productId = owner.id;
      }
      if (!owner) return;
      Object.assign(owner, productPatch, { updatedAt: now });
      if (targetVariant) Object.assign(targetVariant, variantPatch);
      else if (sku) {
        owner.variants.push({
          id: `${owner.id}-variant-${owner.variants.length + 1}`,
          sku,
          price: variantPatch.price ?? owner.price,
          stock: variantPatch.stock ?? 0,
          attributes: {},
        });
        owner.variantCount = owner.variants.length;
        owner.sku ??= sku;
        row.variantId = owner.variants[owner.variants.length - 1].id;
      }
      syncProductStock(owner);
    };
  }

  const rows = plans.map((p) => p.row);
  const summary = {
    total: rows.length,
    create: new Set(rows.filter((r) => r.action === 'create').map((r) => r.slug)).size,
    createVariant: rows.filter((r) => r.action === 'create_variant').length,
    update: rows.filter((r) => r.action === 'update').length,
    unchanged: rows.filter((r) => r.action === 'unchanged').length,
    rejected: rows.filter((r) => r.action === 'reject').length,
  };
  const result: ImportResult = { dryRun, type, summary, rows };
  if (summary.rejected > 0) {
    return {
      status: 422,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'one or more rows are invalid; nothing was changed',
        details: result,
      },
    };
  }
  if (!dryRun) for (const plan of plans) plan.apply?.();
  return { data: result };
}
