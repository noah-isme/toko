import { products, soldOutDemoProduct } from '../fixtures';

import { sessionValue } from './session';
import type { MockResolver, MockResult } from './types';

import type { AlertSubscription, AlertType } from '@/entities/alerts/types';

/**
 * Product alerts (`/alerts`, toko-api openapi). The MSW handlers
 * (`handlers.alerts.ts`) and the `/api/v1` route share these operations; MSW
 * keeps one global store, the route one store per mock session.
 *
 * Mirrors the backend rules: BACK_IN_STOCK is refused with 409 ALREADY_IN_STOCK
 * while the target is sellable (variant: stock > 0, product-level: inStock);
 * posting an existing (product, variant, type) re-arms it with 200.
 */
type AlertRecord = Omit<AlertSubscription, 'product' | 'variant'>;
export type AlertStore = { seq: number; items: AlertRecord[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 100;
const TYPES: readonly AlertType[] = ['BACK_IN_STOCK', 'PRICE_DROP'];

function alertId(seq: number) {
  return `a1e70000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

export function seedAlerts(): AlertStore {
  const [first, second] = products;
  return {
    seq: 2,
    items: [
      {
        id: alertId(2),
        productId: first.id,
        variantId: null,
        type: 'PRICE_DROP',
        priceAtSubscribe: first.price,
        status: 'active',
        notifiedAt: null,
        createdAt: '2026-10-20T09:00:00Z',
      },
      {
        id: alertId(1),
        productId: second.id,
        variantId: null,
        type: 'BACK_IN_STOCK',
        priceAtSubscribe: null,
        status: 'notified',
        notifiedAt: '2026-10-18T07:30:00Z',
        createdAt: '2026-10-15T12:00:00Z',
      },
    ],
  };
}

function badRequest(message: string): MockResult {
  return { status: 400, error: { code: 'BAD_REQUEST', message } };
}

function notFound(message: string): MockResult {
  return { status: 404, error: { code: 'NOT_FOUND', message } };
}

/** Catalog products plus the off-catalog sold-out QA product. */
function findProduct(id: string) {
  if (id === soldOutDemoProduct.id) return soldOutDemoProduct;
  return products.find((p) => p.id === id);
}

function toDto(record: AlertRecord): AlertSubscription {
  const product = findProduct(record.productId);
  return {
    ...record,
    product: {
      title: product?.title ?? '',
      slug: product?.slug ?? '',
      thumbnail: product?.imageUrl ?? null,
      price: product?.price ?? 0,
      inStock: product?.inStock ?? false,
    },
  };
}

function positiveInt(raw: string | null, fallback: number) {
  const value = Math.floor(Number(raw ?? fallback));
  return Number.isFinite(value) && value >= 1 ? value : fallback;
}

/** `GET alerts?page=&limit=&productId=`, newest first. */
export function listAlerts(store: AlertStore, searchParams: URLSearchParams): MockResult {
  const productId = searchParams.get('productId')?.trim();
  if (productId && !UUID.test(productId)) return badRequest('invalid productId');
  const page = positiveInt(searchParams.get('page'), 1);
  const limit = Math.min(MAX_LIMIT, positiveInt(searchParams.get('limit'), 20));
  const filtered = productId
    ? store.items.filter((item) => item.productId === productId)
    : store.items;
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit).map(toDto),
    pagination: { page, perPage: limit, totalItems: filtered.length },
  };
}

/** `POST alerts`: 201 created, 200 re-armed. */
export function subscribeAlert(store: AlertStore, body: unknown): MockResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return badRequest('invalid payload');
  }
  const input = body as Record<string, unknown>;
  const productId = typeof input.productId === 'string' ? input.productId.trim() : '';
  if (!UUID.test(productId)) return badRequest('invalid productId');
  const rawVariant = typeof input.variantId === 'string' ? input.variantId.trim() : '';
  if (rawVariant && !UUID.test(rawVariant)) return badRequest('invalid variantId');
  const type = typeof input.type === 'string' ? input.type.trim().toUpperCase() : '';
  if (!TYPES.includes(type as AlertType)) {
    return badRequest('type must be BACK_IN_STOCK or PRICE_DROP');
  }

  const product = findProduct(productId);
  // Mock catalog products have no variants, so any variant id is "not of product".
  if (!product || rawVariant) return notFound('product or variant not found');
  if (type === 'BACK_IN_STOCK' && product.inStock) {
    return {
      status: 409,
      error: { code: 'ALREADY_IN_STOCK', message: 'product is already in stock' },
    };
  }

  const priceAtSubscribe = type === 'PRICE_DROP' ? product.price : null;
  const existing = store.items.find(
    (item) => item.productId === productId && item.variantId === null && item.type === type,
  );
  if (existing) {
    existing.status = 'active';
    existing.notifiedAt = null;
    existing.priceAtSubscribe = priceAtSubscribe;
    return { status: 200, data: toDto(existing) };
  }

  store.seq += 1;
  const record: AlertRecord = {
    id: alertId(store.seq),
    productId,
    variantId: null,
    type: type as AlertType,
    priceAtSubscribe,
    status: 'active',
    notifiedAt: null,
    createdAt: new Date().toISOString(),
  };
  store.items.unshift(record);
  return { status: 201, data: toDto(record) };
}

/** `DELETE alerts/{id}`: 204, 400 for a malformed id, 404 when unknown. */
export function deleteAlert(store: AlertStore, id: string): MockResult {
  if (!UUID.test(id)) return badRequest('invalid alert id');
  const index = store.items.findIndex((item) => item.id === id);
  if (index < 0) return notFound('alert not found');
  store.items.splice(index, 1);
  return { status: 204 };
}

const ITEM_PATH = /^alerts\/([^/]+)$/;

export const resolveAlerts: MockResolver = ({ path, method, body, sessionId, searchParams }) => {
  if (path !== 'alerts' && !path.startsWith('alerts/')) return undefined;
  const store = () => sessionValue('alerts', sessionId, seedAlerts);

  if (path === 'alerts' && method === 'GET') return listAlerts(store(), searchParams);
  if (path === 'alerts' && method === 'POST') return subscribeAlert(store(), body);
  const item = method === 'DELETE' ? ITEM_PATH.exec(path) : null;
  if (item) return deleteAlert(store(), decodeURIComponent(item[1]));
  return undefined;
};
