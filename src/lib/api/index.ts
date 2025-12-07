/**
 * Main API Module Export
 *
 * This module provides a complete API integration for the Toko e-commerce platform.
 *
 * @example
 * ```typescript
 * import { authApi, useProducts, formatCurrency } from '@/lib/api';
 *
 * // Use service directly
 * const user = await authApi.getCurrentUser();
 *
 * // Use React hooks
 * const { data: products, isLoading } = useProducts({ category: 'electronics' });
 *
 * // Use utilities
 * const formatted = formatCurrency(12000000); // "Rp 12.000.000"
 * ```
 */

// API Client
export { apiClient, setAccessToken, getAccessToken, ApiClientError } from './apiClient';

// Services
export { authApi, catalogApi, cartApi, ordersApi, addressApi } from './services';

// React Query Hooks
export {
  queryKeys,
  useRegister,
  useLogin,
  useLogout,
  useCurrentUser,
  useCategories,
  useBrands,
  useProducts,
  useProduct,
  useRelatedProducts,
  useCart,
  useAddToCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useApplyVoucher,
  useRemoveVoucher,
  useShippingQuote,
  useMergeCart,
  useCheckout,
  useOrders,
  useOrder,
  useCancelOrder,
  useShipment,
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from './hooks.react-query';

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
