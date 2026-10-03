/**
 * Main API Module Export
 *
 * This module provides a complete API integration for the Toko e-commerce platform.
 *
 * React Query hooks live in `src/entities/<domain>/` (see ADR-007); this barrel
 * exports services, utilities, constants and types only.
 *
 * @example
 * ```typescript
 * import { authApi, formatCurrency } from '@/lib/api';
 *
 * // Use service directly
 * const user = await authApi.getCurrentUser();
 *
 * // Use utilities
 * const formatted = formatCurrency(12000000); // "Rp 12.000.000"
 * ```
 */

// API Client
export {
  apiClient,
  setAccessToken,
  getAccessToken,
  setCsrfToken,
  getCsrfToken,
  getCsrfTokenFromCookie,
  ensureCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  ApiClientError,
} from './apiClient';

// Services
export {
  authApi,
  catalogApi,
  cartApi,
  ordersApi,
  addressApi,
  notificationsApi,
  promotionsApi,
  privacyApi,
  paymentApi,
} from './services';

// Utilities
export {
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
  calculateDiscountPercent,
  buildQueryString,
  debounce,
  generateUUID,
  isValidPhoneNumber,
  formatPhoneNumber,
  truncateText,
  getInitials,
} from './utils';

// Constants
export {
  ORDER_STATUS_LABELS,
  SHIPMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  COURIER_NAMES,
  PRODUCT_SORT_OPTIONS,
  PAGINATION_DEFAULTS,
  PRICE_RANGES,
} from './constants';

// Types (excluding Address - use from @/entities/address/types)
export type * from './types';

// Re-export Address types from entities
export type { Address, AddressInput } from '@/entities/address/types';

// Mappers
export { mapAddressFromApi, mapAddressToApi, mapAddressUpdateToApi } from './mappers';

// Response Normalizer
export {
  normalizeResponse,
  normalizeArrayResponse,
  normalizeObjectResponse,
  extractData,
  isEnvelopedResponse,
  mapRawReviewToNormalized,
  mapRawReviewStatsToNormalized,
  mapRawFavoriteToNormalized,
  snakeToCamelCase,
  mapArraySnakeToCamel,
  NON_STANDARD_ENVELOPE_ENDPOINTS,
  type StandardEnvelope,
  type EnvelopedResponse,
  type RawReview,
  type NormalizedReview,
  type RawReviewStats,
  type NormalizedReviewStats,
  type RawFavorite,
  type NormalizedFavorite,
  type NonStandardEndpoint,
} from './responseNormalizer';
