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

// ============================================================================
// Authentication & User Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
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

// ============================================================================
// Address Types (Raw API Format - snake_case)
// ============================================================================

/**
 * Raw address response from API (snake_case format)
 * Use Address from @/entities/address/types for app usage
 */
export interface ApiAddressResponse {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
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
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

/**
 * Address update request (snake_case for API)
 */
export interface ApiUpdateAddressRequest extends Partial<ApiCreateAddressRequest> { }

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
  | 'processing'
  | 'shipped'
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

export interface OrderVoucher {
  code: string;
  discount: number;
}

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
  orderId: string;
  status: OrderStatus;
  message: string;
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
  | 'RATE_LIMIT_EXCEEDED';
