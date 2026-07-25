/**
 * TypeScript Type Definitions for Toko API
 * Auto-generated from API contract documentation
 *
 * @version 0.2.0
 * @lastUpdated 2025-12-07
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface Pagination {
  page: number;
  perPage: number;
  totalItems: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/** Offset-based pagination (admin endpoints) — matches backend convention */
export interface OffsetLimitPagination {
  offset: number;
  limit: number;
  total?: number;
}

export interface OffsetPaginatedResponse<T> {
  data: T[];
  total?: number;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Machine-readable notification kind. Kept as a widened union so the UI can
 * degrade gracefully if the backend introduces a new type.
 */
export type NotificationType =
  | 'order_paid'
  | 'order_canceled'
  | 'payment_failed'
  | 'payment_expired'
  | 'shipment_shipped'
  | 'shipment_out_for_delivery'
  | 'shipment_delivered'
  | (string & {});

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Arbitrary JSON context; always present ({} when empty). May carry orderId. */
  data: { orderId?: string; topic?: string; [key: string]: unknown };
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCountResponse {
  unread: number;
}

// ============================================================================
// Authentication & User Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface UpdateProfileRequest {
  name: string;
  phone?: string;
}

export interface MessageResponse {
  message: string;
}

export interface SessionInfo {
  id: string;
  device: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  current: boolean;
}

// ============================================================================
// Address Types (Raw API Format - snake_case)
// ============================================================================

/**
 * Raw address response from API (snake_case format)
 * Use Address from @/entities/address/types for app usage
 */
export interface ApiAddressResponse {
  id: string;
  receiver_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Address creation request (snake_case for API)
 */
export interface ApiCreateAddressRequest {
  receiver_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

/**
 * Address update request (snake_case for API)
 */
export interface ApiUpdateAddressRequest extends Partial<ApiCreateAddressRequest> {}

// ============================================================================
// Catalog Types (Raw API Format)
// ============================================================================

export interface ApiProduct {
  id: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  compareAt?: number;
  inStock?: boolean;
  thumbnail?: string;
  badges?: string[];
  rating?: number;
  reviewCount?: number;
  categoryId?: string;
  brand?: string;
  brandName?: string;
}

export interface ApiProductListResponse {
  data: ApiProduct[];
  pagination: Pagination;
}

// ============================================================================
// Catalog Types
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  createdAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  createdAt?: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

// Product interface matching API Contract v0.2.0 (line 354-386)
export interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  currency: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  imageUrl?: string; // Primary image
  images?: string[];
  stock: number;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  createdAt?: string;
}

export interface ProductDetail extends Product {
  variants?: ProductVariant[];
  specifications?: Record<string, string>;
  weight?: number;
  dimensions?: string;
  updatedAt: string;
}

export type ProductSortOption = 'price:asc' | 'price:desc' | 'name:asc' | 'name:desc';

export interface ProductFilters {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: ProductSortOption;
  page?: number;
  limit?: number;
}

// ============================================================================
// Cart Types
// ============================================================================

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  title: string;
  slug: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  imageUrl?: string;
}

export interface CartPricing {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface Cart {
  id: string;
  anonId?: string | null;
  voucher?: string | null;
  items: CartItem[];
  pricing: CartPricing;
  currency: string;
}

export interface CreateCartRequest {
  anonId?: string;
}

export interface CreateCartResponse {
  cartId: string;
  anonId: string;
  voucher?: string | null;
}

export interface AddCartItemRequest {
  productId: string;
  variantId?: string | null;
  qty: number;
}

export interface UpdateCartItemRequest {
  qty: number;
}

export interface ApplyVoucherRequest {
  code: string;
}

export interface ApplyVoucherResponse {
  discount: number;
}

export interface MergeCartRequest {
  cartId: string;
}

export interface MergeCartResponse {
  cartId: string;
}

// ============================================================================
// Shipping Types
// ============================================================================

export interface ShippingRate {
  service: string;
  description: string;
  cost: number;
  etd: string;
  note?: string;
}

export interface ShippingQuoteRequest {
  destination: string;
  courier: string;
  weightGram: number;
}

export type CourierCode = 'jne' | 'pos' | 'tiki' | 'sicepat' | 'jnt';

export interface TaxQuoteResponse {
  tax: number;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod =
  | 'bank_transfer'
  | 'virtual_account'
  | 'credit_card'
  | 'ewallet_gopay'
  | 'ewallet_ovo'
  | 'ewallet_dana';

export interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  variantName?: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  imageUrl?: string;
}

export interface OrderShippingAddress {
  receiverName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface OrderPricing {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

/** Full voucher object for order detail (matches Voucher) */
export type OrderVoucher = Voucher;

export interface OrderShipping {
  courier: string;
  service: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  shippedAt?: string;
}

export interface OrderPayment {
  method: PaymentMethod;
  methodLabel: string;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: string;
  paymentUrl?: string;
  expiryAt?: string;
}

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  total: number;
  currency: string;
  itemCount: number;
  thumbnailUrl?: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends Order {
  user: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
  shippingAddress: OrderShippingAddress;
  pricing: OrderPricing;
  voucher?: OrderVoucher;
  shipping?: OrderShipping;
  payment: OrderPayment;
  notes?: string;
  statusHistory: OrderStatusHistory[];
}

export interface CheckoutRequest {
  cartId: string;
  shippingAddressId: string;
  shippingService: string;
  shippingCost: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentUrl?: string;
  paymentExpiry?: string;
  createdAt: string;
}

export interface CancelOrderResponse {
  status: OrderStatus;
}

// ============================================================================
// Shipment Tracking Types
// ============================================================================

export type ShipmentStatus =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'on_delivery'
  | 'delivered'
  | 'failed';

export interface TrackingEvent {
  timestamp: string;
  status: ShipmentStatus;
  location: string;
  description: string;
}

export interface Shipment {
  orderId: string;
  trackingNumber: string;
  courier: string;
  service: string;
  status: ShipmentStatus;
  statusLabel: string;
  estimatedDelivery?: string;
  shippedAt: string;
  tracking: TrackingEvent[];
}

// ============================================================================
// Error Code Types
// ============================================================================

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'INTERNAL'
  | 'UNAVAILABLE'
  | 'CART_EXPIRED'
  | 'OUT_OF_STOCK'
  | 'VOUCHER_INVALID'
  | 'VOUCHER_MIN_SPEND'
  | 'VOUCHER_ALREADY_USED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NOT_ELIGIBLE'
  | 'INVALID_STATE'
  | 'ANALYTICS_NOT_CONFIGURED'
  | 'ANALYTICS_ERROR'
  | 'CONFLICT'
  | 'ALREADY_EXISTS'
  | 'NOT_IMPLEMENTED';

// ============================================================================
// Voucher Types (Admin)
// ============================================================================

export type VoucherKind = 'fixed_amount' | 'percent';

export interface Voucher {
  id: string;
  code: string;
  kind: VoucherKind;
  value: number;
  percentBps?: number;
  minSpend: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  validFrom: string;
  validTo: string;
  productIds: string[];
  categoryIds: string[];
  brandIds: string[];
  combinable: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface CreateVoucherRequest {
  code: string;
  value: number;
  kind?: VoucherKind;
  percentBps?: number;
  minSpend?: number;
  usageLimit?: number;
  validFrom?: string;
  validTo?: string;
  productIds?: string[];
  categoryIds?: string[];
  brandIds?: string[];
  combinable?: boolean;
  priority?: number;
  perUserLimit?: number;
}

export interface UpdateVoucherRequest extends Partial<CreateVoucherRequest> {}

export interface VoucherPreviewRequest {
  code: string;
  cartTotal: number;
  userId?: string;
  items: VoucherPreviewItem[];
}

export interface VoucherPreviewItem {
  productId?: string;
  categoryId?: string;
  brandId?: string;
  subtotal: number;
}

export interface VoucherPreviewResponse {
  eligible: boolean;
  discount: number;
  eligibleSubtotal: number;
  finalTotal: number;
  voucher: Voucher;
  message?: string;
}

// ============================================================================
// Webhook Types (Admin)
// ============================================================================

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  active: boolean;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed';

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventId: string;
  status: WebhookDeliveryStatus;
  attempt: number;
  maxAttempt: number;
  nextAttemptAt?: string;
  lastError?: string;
  responseStatus?: number;
  responseBody?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface WebhookDlq {
  id: string;
  kind: string;
  idempotencyKey: string;
  attempts: number;
  lastError: string;
  createdAt: string;
  message: {
    kind: string;
    key: string;
    payload: Record<string, any>;
    attempt: number;
    maxAttempts: number;
    availableAt: number;
  };
}

export interface CreateWebhookEndpointRequest {
  name: string;
  url: string;
  secret: string;
  active?: boolean;
  topics?: string[];
}

export interface UpdateWebhookEndpointRequest extends Partial<CreateWebhookEndpointRequest> {}

export interface ListWebhookEndpointsParams {
  limit?: number;
  offset?: number;
}

export interface ListWebhookDeliveriesParams {
  endpointId?: string;
  eventId?: string;
  status?: WebhookDeliveryStatus;
  limit?: number;
  offset?: number;
}

export interface ReplayDlqRequest {
  ids?: string[];
  kind?: string;
  limit?: number;
}

// ============================================================================
// Analytics Types (Admin)
// ============================================================================

export interface AnalyticsQueryParams {
  from?: string; // RFC3339
  to?: string; // RFC3339
  days?: number;
  limit?: number;
  offset?: number;
}

export interface SalesAnalyticsRow {
  day: string;
  paidOrders: number;
  allOrders: number;
  revenue: number;
}

export interface TopProductsAnalyticsRow {
  productId: string;
  qtySold: number;
  gross: number;
}

export interface AnalyticsOverviewResponse {
  // Not yet implemented - returns 501
}

// ============================================================================
// Order Types Expansion
// ============================================================================

export interface OrderShippingTrackingEvent {
  timestamp: string;
  status: ShipmentStatus;
  location: string;
  description: string;
}

export interface OrderShipping {
  courier: string;
  service: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  shippedAt?: string;
  status: ShipmentStatus;
  statusLabel: string;
  tracking: OrderShippingTrackingEvent[];
}

export interface OrderStatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  valid: boolean;
  reason?: string;
}

export interface PatchOrderStatusRequest {
  status: OrderStatus;
}

/** Admin-allowed target statuses for order transitions */
export const ALLOWED_ADMIN_ORDER_TARGETS: OrderStatus[] = [
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

/** Status rank for transition validation (matches backend orderStatusRank) */
export const ORDER_STATUS_RANK: Record<OrderStatus, number> = {
  pending_payment: 0,
  paid: 1,
  packed: 2,
  shipped: 3,
  out_for_delivery: 4,
  delivered: 5,
  cancelled: -1,
};

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  const fromRank = ORDER_STATUS_RANK[from] ?? -2;
  const toRank = ORDER_STATUS_RANK[to] ?? -2;
  const isAllowedTarget = ALLOWED_ADMIN_ORDER_TARGETS.includes(to);
  return isAllowedTarget && fromRank < toRank;
}
