/**
 * Product alert subscriptions (`/alerts`, toko-api openapi `AlertSubscription`).
 * Prices are whole rupiah. `generated/conformance.ts` keeps this in step with
 * the wire schema.
 */
export type AlertType = 'BACK_IN_STOCK' | 'PRICE_DROP';
export type AlertStatus = 'active' | 'notified';

export interface AlertProductSnapshot {
  title: string;
  slug: string;
  thumbnail: string | null;
  price: number;
  inStock: boolean;
}

export interface AlertVariantSnapshot {
  id: string;
  sku: string | null;
  price: number;
  stock: number;
}

export interface AlertSubscription {
  id: string;
  productId: string;
  variantId: string | null;
  type: AlertType;
  /** Null for BACK_IN_STOCK. */
  priceAtSubscribe: number | null;
  status: AlertStatus;
  notifiedAt: string | null;
  createdAt: string;
  product: AlertProductSnapshot;
  /** Omitted when `variantId` is null. */
  variant?: AlertVariantSnapshot;
}

export interface AlertSubscribeInput {
  productId: string;
  variantId?: string | null;
  type: AlertType;
}

export interface AlertListParams {
  page?: number;
  limit?: number;
  productId?: string;
}

export interface AlertListResponse {
  data: AlertSubscription[];
  pagination: { page: number; perPage: number; totalItems: number };
}
