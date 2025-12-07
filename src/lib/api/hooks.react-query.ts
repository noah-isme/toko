/**
 * React Query Hooks for API Integration
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

import { authApi, catalogApi, cartApi, ordersApi, addressApi } from './services';
import type {
  RegisterRequest,
  LoginRequest,
  ProductFilters,
  AddCartItemRequest,
  UpdateCartItemRequest,
  ApplyVoucherRequest,
  CheckoutRequest,
  CreateAddressRequest,
  UpdateAddressRequest,
  ShippingQuoteRequest,
} from './types';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  auth: {
    currentUser: ['auth', 'currentUser'] as const,
  },
  catalog: {
    categories: ['catalog', 'categories'] as const,
    brands: ['catalog', 'brands'] as const,
    products: (filters?: ProductFilters) => ['catalog', 'products', filters] as const,
    product: (slug: string) => ['catalog', 'product', slug] as const,
    relatedProducts: (slug: string) => ['catalog', 'relatedProducts', slug] as const,
  },
  cart: {
    detail: (cartId: string | null) => ['cart', cartId] as const,
  },
  orders: {
    list: (page?: number) => ['orders', 'list', page] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
    shipment: (orderId: string) => ['orders', 'shipment', orderId] as const,
  },
  address: {
    list: (page?: number) => ['address', 'list', page] as const,
  },
};

// ============================================================================
// Auth Hooks
// ============================================================================

export function useRegister(options?: UseMutationOptions<any, Error, RegisterRequest>) {
  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    ...options,
  });
}

export function useLogin(options?: UseMutationOptions<any, Error, LoginRequest>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser });
    },
    ...options,
  });
}

export function useLogout(options?: UseMutationOptions<void, Error>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
    ...options,
  });
}

export function useCurrentUser(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.auth.currentUser,
    queryFn: () => authApi.getCurrentUser(),
    enabled,
    retry: false,
  });
}

// ============================================================================
// Catalog Hooks
// ============================================================================

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.catalog.categories,
    queryFn: () => catalogApi.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.catalog.brands,
    queryFn: () => catalogApi.getBrands(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.catalog.products(filters),
    queryFn: () => catalogApi.getProducts(filters),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: queryKeys.catalog.product(slug),
    queryFn: () => catalogApi.getProduct(slug),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useRelatedProducts(slug: string) {
  return useQuery({
    queryKey: queryKeys.catalog.relatedProducts(slug),
    queryFn: () => catalogApi.getRelatedProducts(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Cart Hooks
// ============================================================================

export function useCart(cartId: string | null) {
  return useQuery({
    queryKey: queryKeys.cart.detail(cartId),
    queryFn: () => (cartId ? cartApi.getCart(cartId) : null),
    enabled: !!cartId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAddToCart(cartId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddCartItemRequest) => cartApi.addItem(cartId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail(cartId) });
    },
  });
}

export function useUpdateCartItem(cartId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateCartItemRequest }) =>
      cartApi.updateItem(cartId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail(cartId) });
    },
  });
}

export function useRemoveCartItem(cartId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(cartId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail(cartId) });
    },
  });
}

export function useApplyVoucher(cartId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApplyVoucherRequest) => cartApi.applyVoucher(cartId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail(cartId) });
    },
  });
}

export function useRemoveVoucher(cartId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartApi.removeVoucher(cartId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail(cartId) });
    },
  });
}

export function useShippingQuote(cartId: string) {
  return useMutation({
    mutationFn: (data: ShippingQuoteRequest) => cartApi.getShippingQuote(cartId, data),
  });
}

export function useMergeCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cartId: string) => cartApi.mergeCart({ cartId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// ============================================================================
// Orders Hooks
// ============================================================================

export function useCheckout(options?: UseMutationOptions<any, Error, CheckoutRequest>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckoutRequest) => ordersApi.checkout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() });
    },
    ...options,
  });
}

export function useOrders(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.orders.list(page),
    queryFn: () => ordersApi.getOrders(page, limit),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => ordersApi.cancelOrder(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() });
    },
  });
}

export function useShipment(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.shipment(orderId),
    queryFn: () => ordersApi.getShipment(orderId),
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// Address Hooks
// ============================================================================

export function useAddresses(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.address.list(page),
    queryFn: () => addressApi.getAddresses(page, limit),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAddressRequest) => addressApi.createAddress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.address.list() });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, data }: { addressId: string; data: UpdateAddressRequest }) =>
      addressApi.updateAddress(addressId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.address.list() });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => addressApi.deleteAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.address.list() });
    },
  });
}
