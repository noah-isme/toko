/**
 * Admin API Service
 *
 * Mirrors the `/api/v1/admin/*` routes registered in toko-api. Every call here
 * requires an authenticated admin session: the backend applies RequireAuth plus
 * a role check, so a non-admin token gets 403.
 *
 * Money values are integers in minor currency units (IDR has no subunit in this
 * store, so they are plain rupiah).
 */
import { apiClient } from '../apiClient';
import type { ApiResponse, PaginatedResponse } from '../types';

// ============================================================================
// Products
// ============================================================================

export interface AdminProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAt?: number | null;
  inStock: boolean;
  /** Sum of variant stock. */
  stock: number;
  thumbnail?: string | null;
  badges: string[];
  description?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  brandId?: string | null;
  brandName?: string | null;
  variantCount: number;
  /** Primary (first) variant SKU, when the product has variants. */
  sku?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface AdminProductSpec {
  key: string;
  value: string;
}

export interface AdminProductVariant {
  id: string;
  sku?: string | null;
  price: number;
  stock: number;
  attributes: Record<string, unknown>;
}

export interface AdminProductDetail extends AdminProduct {
  images: AdminProductImage[];
  specs: AdminProductSpec[];
  variants: AdminProductVariant[];
}

export interface AdminProductVariantInput {
  /** Omit to insert a new variant; provide to update an existing one. */
  id?: string;
  sku?: string | null;
  price?: number;
  stock?: number;
  attributes?: Record<string, unknown>;
}

export interface AdminProductInput {
  title?: string;
  /** Derived from the title when omitted on create. */
  slug?: string;
  price?: number;
  compareAt?: number | null;
  inStock?: boolean;
  thumbnail?: string | null;
  badges?: string[];
  description?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  /** Replaces the whole image collection when present. */
  images?: string[];
  /** Replaces the whole spec collection when present. */
  specs?: AdminProductSpec[];
  variants?: AdminProductVariantInput[];
}

export interface AdminProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Category slug. */
  category?: string;
  /** Brand slug. */
  brand?: string;
  inStock?: boolean;
}

// ============================================================================
// Categories and brands
// ============================================================================

export interface AdminTaxonomy {
  id: string;
  name: string;
  slug: string;
  /** Categories only. */
  parentId?: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTaxonomyInput {
  name?: string;
  slug?: string;
  parentId?: string | null;
}

// ============================================================================
// Orders
// ============================================================================

/** Order status values as stored by the backend enum. */
export type AdminOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface AdminOrder {
  id: string;
  orderNumber?: string | null;
  userId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  status: AdminOrderStatus;
  /** Latest payment status; empty string when no payment row exists. */
  paymentStatus: string;
  currency: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  voucherCode?: string | null;
  itemsCount: number;
  courier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderItem {
  id: string;
  productId?: string | null;
  variantId?: string | null;
  title: string;
  slug: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface AdminOrderDetail extends AdminOrder {
  shippingAddress: Record<string, unknown>;
  shippingOption: Record<string, unknown>;
  notes?: string | null;
  items: AdminOrderItem[];
}

export interface AdminOrderListParams {
  page?: number;
  limit?: number;
  /** Pass 'all' or omit for no status filter. */
  status?: AdminOrderStatus | 'all';
  search?: string;
  /** RFC3339 timestamp or YYYY-MM-DD. */
  startDate?: string;
  endDate?: string;
}

export interface AdminOrderStats {
  totalOrders: number;
  /** Excludes cancelled orders. */
  totalRevenue: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
}

export interface ShipmentData {
  courier: string;
  trackingNumber: string;
}

// ============================================================================
// Vouchers
// ============================================================================

export type AdminVoucherKind = 'percent' | 'fixed_amount';

export interface AdminVoucher {
  id: string;
  code: string;
  kind: AdminVoucherKind;
  /** Fixed discount amount; 0 for percent vouchers. */
  value: number;
  /** Percentage in basis points (1000 = 10%). */
  percentBps?: number | null;
  minSpend: number;
  usageLimit?: number | null;
  usedCount: number;
  perUserLimit?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  combinable: boolean;
  priority: number;
  productIds: string[];
  categoryIds: string[];
  brandIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminVoucherInput {
  code: string;
  kind: AdminVoucherKind;
  value?: number;
  percentBps?: number | null;
  minSpend?: number;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  combinable?: boolean;
  priority?: number;
  productIds?: string[];
  categoryIds?: string[];
  brandIds?: string[];
}

export interface AdminVoucherListParams {
  page?: number;
  limit?: number;
  search?: string;
  kind?: AdminVoucherKind | 'all';
}

export interface AdminVoucherStats {
  totalVouchers: number;
  activeVouchers: number;
  totalUsage: number;
}

// ============================================================================
// Analytics
// ============================================================================

export type AdminAnalyticsRange = '7d' | '30d' | '90d' | 'all';

export interface AdminTopProduct {
  productId: string;
  title: string;
  slug: string;
  unitsSold: number;
  revenue: number;
}

export interface AdminAnalyticsOverview {
  range: AdminAnalyticsRange;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  topProducts: AdminTopProduct[];
}

// ============================================================================
// Queue, webhooks, and audit
// ============================================================================

/** Queue kinds the API workers register. `kind` is required on queue endpoints. */
export type QueueKind = 'webhook' | 'demo';

export interface QueueStats {
  kind: string;
  ready: number;
  processing: number;
  dlq: number;
  oldest_lag_ms: number;
  visibility_timeout: number;
}

export interface DeadLetterMessage {
  kind?: string;
  payload?: unknown;
  attempt?: number;
  [key: string]: unknown;
}

export interface DeadLetterEntry {
  id: string;
  kind: string;
  idempotencyKey: string;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
  message: DeadLetterMessage;
}

export interface DeadLetterReplayResult {
  replayed: string[];
  failed: Record<string, string>;
  kind?: string;
}

/**
 * Webhook rows come straight from sqlc, so their JSON keys are snake_case
 * unlike the hand-written admin DTOs above.
 */
export interface AdminWebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  active: boolean;
  topics: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminWebhookEndpointInput {
  name: string;
  url: string;
  secret: string;
  active?: boolean;
  topics: string[];
}

export interface AdminWebhookDelivery {
  id: string;
  endpoint_id: string;
  event_id: string;
  status: string;
  attempt: number;
  max_attempt: number;
  next_attempt_at?: string | null;
  last_error?: string | null;
  response_status?: number | null;
  response_body?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actorKind: 'user' | 'system' | 'anonymous';
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  method: string;
  path: string;
  route?: string | null;
  status: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Builds a query string, skipping undefined/empty values so the backend sees an
 * absent filter rather than an empty one.
 */
function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const adminApi = {
  // ============ Products ============

  async getProducts(params: AdminProductListParams = {}): Promise<PaginatedResponse<AdminProduct>> {
    return apiClient<PaginatedResponse<AdminProduct>>(`/admin/products${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },

  /** Accepts a product UUID or slug. */
  async getProduct(id: string): Promise<AdminProductDetail> {
    const response = await apiClient<ApiResponse<AdminProductDetail>>(`/admin/products/${id}`, {
      requiresAuth: true,
    });
    return response.data;
  },

  async createProduct(data: AdminProductInput): Promise<{ id: string; slug: string }> {
    const response = await apiClient<ApiResponse<{ id: string; slug: string }>>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Partial update. Only the keys present in `data` change; passing null for a
   * nullable field clears it.
   */
  async updateProduct(id: string, data: AdminProductInput): Promise<void> {
    await apiClient<void>(`/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient<void>(`/admin/products/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /** Writes primary-variant stock and keeps the in_stock flag consistent. */
  async updateProductStock(
    id: string,
    data: { stock?: number; inStock?: boolean },
  ): Promise<{ id: string; inStock: boolean; stock: number | null }> {
    const response = await apiClient<
      ApiResponse<{ id: string; inStock: boolean; stock: number | null }>
    >(`/admin/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  // ============ Categories ============

  async getCategories(): Promise<AdminTaxonomy[]> {
    const response = await apiClient<ApiResponse<AdminTaxonomy[]>>('/admin/categories', {
      requiresAuth: true,
    });
    return response.data;
  },

  async createCategory(data: AdminTaxonomyInput): Promise<AdminTaxonomy> {
    const response = await apiClient<ApiResponse<AdminTaxonomy>>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async updateCategory(id: string, data: AdminTaxonomyInput): Promise<AdminTaxonomy> {
    const response = await apiClient<ApiResponse<AdminTaxonomy>>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient<void>(`/admin/categories/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  // ============ Brands ============

  async getBrands(): Promise<AdminTaxonomy[]> {
    const response = await apiClient<ApiResponse<AdminTaxonomy[]>>('/admin/brands', {
      requiresAuth: true,
    });
    return response.data;
  },

  async createBrand(data: AdminTaxonomyInput): Promise<AdminTaxonomy> {
    const response = await apiClient<ApiResponse<AdminTaxonomy>>('/admin/brands', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async updateBrand(id: string, data: AdminTaxonomyInput): Promise<AdminTaxonomy> {
    const response = await apiClient<ApiResponse<AdminTaxonomy>>(`/admin/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async deleteBrand(id: string): Promise<void> {
    await apiClient<void>(`/admin/brands/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  // ============ Orders ============

  async getOrders(params: AdminOrderListParams = {}): Promise<PaginatedResponse<AdminOrder>> {
    return apiClient<PaginatedResponse<AdminOrder>>(`/admin/orders${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },

  async getOrder(id: string): Promise<AdminOrderDetail> {
    const response = await apiClient<ApiResponse<AdminOrderDetail>>(`/admin/orders/${id}`, {
      requiresAuth: true,
    });
    return response.data;
  },

  async getOrderStats(
    params: { startDate?: string; endDate?: string } = {},
  ): Promise<AdminOrderStats> {
    const response = await apiClient<ApiResponse<AdminOrderStats>>(
      `/admin/orders/stats${buildQuery(params)}`,
      { requiresAuth: true },
    );
    return response.data;
  },

  async updateOrderStatus(id: string, status: AdminOrderStatus): Promise<void> {
    await apiClient<void>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      requiresAuth: true,
    });
  },

  async createShipment(orderId: string, data: ShipmentData): Promise<unknown> {
    return apiClient<unknown>(`/admin/orders/${orderId}/shipment`, {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  // ============ Vouchers ============

  async getVouchers(params: AdminVoucherListParams = {}): Promise<PaginatedResponse<AdminVoucher>> {
    return apiClient<PaginatedResponse<AdminVoucher>>(`/admin/vouchers${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },

  async getVoucherStats(): Promise<AdminVoucherStats> {
    const response = await apiClient<ApiResponse<AdminVoucherStats>>('/admin/vouchers/stats', {
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Created by the voucher handler, which echoes the raw DB row (snake_case) and
   * not the camelCase list DTO. Callers refetch the list instead of using the
   * response body, so it is intentionally untyped.
   */
  async createVoucher(data: AdminVoucherInput): Promise<void> {
    await apiClient<unknown>('/admin/vouchers', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /** The backend keys vouchers by code, not id, and uses PUT for a full replace. */
  async updateVoucher(code: string, data: AdminVoucherInput): Promise<void> {
    await apiClient<unknown>(`/admin/vouchers/${code}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  async deleteVoucher(code: string): Promise<void> {
    await apiClient<void>(`/admin/vouchers/${code}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  // ============ Analytics ============

  async getAnalyticsOverview(range: AdminAnalyticsRange = '30d'): Promise<AdminAnalyticsOverview> {
    const response = await apiClient<ApiResponse<AdminAnalyticsOverview>>(
      `/admin/analytics/overview${buildQuery({ range })}`,
      { requiresAuth: true },
    );
    return response.data;
  },

  // ============ Webhooks ============

  async getWebhooks(
    params: { page?: number; limit?: number } = {},
  ): Promise<AdminWebhookEndpoint[]> {
    const response = await apiClient<{ data: AdminWebhookEndpoint[] }>(
      `/admin/webhooks${buildQuery(params)}`,
      { requiresAuth: true },
    );
    return response.data ?? [];
  },

  async createWebhook(data: AdminWebhookEndpointInput): Promise<AdminWebhookEndpoint> {
    return apiClient<AdminWebhookEndpoint>('/admin/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /** Full replace: name, url, secret and topics must all be supplied. */
  async updateWebhook(id: string, data: AdminWebhookEndpointInput): Promise<AdminWebhookEndpoint> {
    return apiClient<AdminWebhookEndpoint>(`/admin/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  async deleteWebhook(id: string): Promise<void> {
    await apiClient<void>(`/admin/webhooks/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async getWebhookDeliveries(
    params: { page?: number; limit?: number; endpointId?: string; status?: string } = {},
  ): Promise<{ data: AdminWebhookDelivery[]; total: number }> {
    const response = await apiClient<{ data: AdminWebhookDelivery[]; total: number }>(
      `/admin/webhook-deliveries${buildQuery(params)}`,
      { requiresAuth: true },
    );
    return { data: response.data ?? [], total: response.total ?? 0 };
  },

  async replayWebhookDelivery(id: string): Promise<AdminWebhookDelivery> {
    return apiClient<AdminWebhookDelivery>(`/admin/webhook-deliveries/${id}/replay`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  // ============ Queue and audit ============

  /**
   * Queue metrics are per kind, so `kind` is required. The handler responds with
   * a bare object rather than the `{data}` envelope used elsewhere.
   */
  async getQueueStats(kind: QueueKind): Promise<QueueStats> {
    return apiClient<QueueStats>(`/admin/queue/stats${buildQuery({ kind })}`, {
      requiresAuth: true,
    });
  },

  async getDeadLetterQueue(
    params: { kind?: QueueKind; limit?: number; offset?: number } = {},
  ): Promise<{ data: DeadLetterEntry[]; total: number }> {
    const response = await apiClient<{ data: DeadLetterEntry[]; total: number }>(
      `/admin/queue/dlq${buildQuery(params)}`,
      { requiresAuth: true },
    );
    return { data: response.data ?? [], total: response.total ?? 0 };
  },

  /** Replays specific entries by id, or a whole kind in batches of `limit`. */
  async replayDeadLetter(body: {
    ids?: string[];
    kind?: QueueKind;
    limit?: number;
  }): Promise<DeadLetterReplayResult> {
    return apiClient<DeadLetterReplayResult>('/admin/queue/dlq/replay', {
      method: 'POST',
      body: JSON.stringify(body),
      requiresAuth: true,
    });
  },

  async getAuditLogs(
    params: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<PaginatedResponse<AuditLog>> {
    return apiClient<PaginatedResponse<AuditLog>>(`/admin/audit-logs${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },
};

// ============================================================================
// Formatting helpers used across admin pages
// ============================================================================

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

/** Human label for an order status enum value. */
export function orderStatusLabel(status: AdminOrderStatus): string {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'Pending Payment';
    case 'PAID':
      return 'Paid';
    case 'PACKED':
      return 'Packed';
    case 'SHIPPED':
      return 'Shipped';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export const ADMIN_ORDER_STATUSES: AdminOrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

/** Discount display string for a voucher, percent or fixed. */
export function voucherValueLabel(voucher: AdminVoucher): string {
  if (voucher.kind === 'percent') {
    const bps = voucher.percentBps ?? 0;
    return `${bps / 100}%`;
  }
  return formatCurrency(voucher.value);
}

/** A voucher is active when it is inside its validity window and has usage left. */
export function isVoucherActive(voucher: AdminVoucher, now: Date = new Date()): boolean {
  if (voucher.validFrom && new Date(voucher.validFrom) > now) return false;
  if (voucher.validTo && new Date(voucher.validTo) < now) return false;
  if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) return false;
  return true;
}
