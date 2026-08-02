/**
 * React Query hooks for the admin dashboard.
 *
 * Kept separate from `hooks.react-query.ts` so storefront bundles never pull in
 * admin-only code. Query keys live in `queryKeys.ts` under the `admin` namespace.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';
import {
  adminApi,
  type AdminAnalyticsRange,
  type AdminOrderListParams,
  type AdminOrderStatus,
  type AdminProductInput,
  type AdminProductListParams,
  type AdminTaxonomyInput,
  type AdminVoucherInput,
  type AdminVoucherListParams,
  type AdminWebhookEndpointInput,
  type QueueKind,
  type ShipmentData,
} from './services/admin';

/** Admin data changes rarely between navigations but must not look stale. */
const STALE_TIME = 30_000;

// ============================================================================
// Products
// ============================================================================

export function useAdminProducts(params: AdminProductListParams = {}) {
  return useQuery({
    queryKey: queryKeys.admin.products(params),
    queryFn: () => adminApi.getProducts(params),
    staleTime: STALE_TIME,
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.product(id ?? ''),
    queryFn: () => adminApi.getProduct(id as string),
    enabled: Boolean(id),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminProductInput) => adminApi.createProduct(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useUpdateAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminProductInput }) =>
      adminApi.updateProduct(id, data),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.product(id) });
    },
  });
}

export function useDeleteAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useUpdateAdminProductStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock, inStock }: { id: string; stock?: number; inStock?: boolean }) =>
      adminApi.updateProductStock(id, { stock, inStock }),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.product(id) });
    },
  });
}

// ============================================================================
// Categories
// ============================================================================

export function useAdminCategories() {
  return useQuery({
    queryKey: queryKeys.admin.categories(),
    queryFn: () => adminApi.getCategories(),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminTaxonomyInput) => adminApi.createCategory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() });
    },
  });
}

export function useUpdateAdminCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminTaxonomyInput }) =>
      adminApi.updateCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() });
    },
  });
}

export function useDeleteAdminCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() });
    },
  });
}

// ============================================================================
// Brands
// ============================================================================

export function useAdminBrands() {
  return useQuery({
    queryKey: queryKeys.admin.brands(),
    queryFn: () => adminApi.getBrands(),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminTaxonomyInput) => adminApi.createBrand(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.brands() });
    },
  });
}

export function useUpdateAdminBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminTaxonomyInput }) =>
      adminApi.updateBrand(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.brands() });
    },
  });
}

export function useDeleteAdminBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteBrand(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.brands() });
    },
  });
}

// ============================================================================
// Orders
// ============================================================================

export function useAdminOrders(params: AdminOrderListParams = {}) {
  return useQuery({
    queryKey: queryKeys.admin.orders(params),
    queryFn: () => adminApi.getOrders(params),
    staleTime: STALE_TIME,
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.order(id ?? ''),
    queryFn: () => adminApi.getOrder(id as string),
    enabled: Boolean(id),
    staleTime: STALE_TIME,
  });
}

export function useAdminOrderStats(params: { startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.admin.orderStats(params),
    queryFn: () => adminApi.getOrderStats(params),
    staleTime: STALE_TIME,
  });
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminOrderStatus }) =>
      adminApi.updateOrderStatus(id, status),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.order(id) });
    },
  });
}

export function useCreateAdminShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, courier, trackingNumber }: { orderId: string } & ShipmentData) =>
      adminApi.createShipment(orderId, { courier, trackingNumber }),
    onSuccess: (_result, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.order(orderId) });
    },
  });
}

// ============================================================================
// Vouchers
// ============================================================================

export function useAdminVouchers(params: AdminVoucherListParams = {}) {
  return useQuery({
    queryKey: queryKeys.admin.vouchers(params),
    queryFn: () => adminApi.getVouchers(params),
    staleTime: STALE_TIME,
  });
}

export function useAdminVoucherStats() {
  return useQuery({
    queryKey: queryKeys.admin.voucherStats(),
    queryFn: () => adminApi.getVoucherStats(),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminVoucherInput) => adminApi.createVoucher(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    },
  });
}

export function useUpdateAdminVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: AdminVoucherInput }) =>
      adminApi.updateVoucher(code, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    },
  });
}

export function useDeleteAdminVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => adminApi.deleteVoucher(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    },
  });
}

// ============================================================================
// Analytics
// ============================================================================

export function useAdminAnalyticsOverview(range: AdminAnalyticsRange = '30d') {
  return useQuery({
    queryKey: queryKeys.admin.analyticsOverview(range),
    queryFn: () => adminApi.getAnalyticsOverview(range),
    staleTime: STALE_TIME,
  });
}

// ============================================================================
// Webhooks
// ============================================================================

export function useAdminWebhooks() {
  return useQuery({
    queryKey: queryKeys.admin.webhooks(),
    queryFn: () => adminApi.getWebhooks(),
    staleTime: STALE_TIME,
  });
}

export function useAdminWebhookDeliveries(
  params: { page?: number; limit?: number; endpointId?: string; status?: string } = {},
) {
  return useQuery({
    queryKey: queryKeys.admin.webhookDeliveries(params),
    queryFn: () => adminApi.getWebhookDeliveries(params),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminWebhookEndpointInput) => adminApi.createWebhook(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.webhooks() });
    },
  });
}

export function useUpdateAdminWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminWebhookEndpointInput }) =>
      adminApi.updateWebhook(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.webhooks() });
    },
  });
}

export function useDeleteAdminWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.webhooks() });
    },
  });
}

export function useReplayAdminWebhookDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.replayWebhookDelivery(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'webhook-deliveries'] });
    },
  });
}

// ============================================================================
// Queue
// ============================================================================

/** Queue depth moves constantly, so poll instead of relying on the stale window. */
const QUEUE_REFETCH_INTERVAL = 10_000;

export function useAdminQueueStats(kind: QueueKind) {
  return useQuery({
    queryKey: queryKeys.admin.queueStats(kind),
    queryFn: () => adminApi.getQueueStats(kind),
    refetchInterval: QUEUE_REFETCH_INTERVAL,
  });
}

export function useAdminDeadLetterQueue(
  params: { kind?: QueueKind; limit?: number; offset?: number } = {},
) {
  return useQuery({
    queryKey: queryKeys.admin.deadLetters(params),
    queryFn: () => adminApi.getDeadLetterQueue(params),
    staleTime: STALE_TIME,
  });
}

export function useReplayDeadLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids?: string[]; kind?: QueueKind; limit?: number }) =>
      adminApi.replayDeadLetter(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] });
    },
  });
}

// ============================================================================
// Audit logs
// ============================================================================

export function useAdminAuditLogs(
  params: { page?: number; limit?: number; action?: string; resourceType?: string } = {},
) {
  return useQuery({
    queryKey: queryKeys.admin.auditLogs(params),
    queryFn: () => adminApi.getAuditLogs(params),
    staleTime: STALE_TIME,
  });
}

export function useAdminInventory() {
  return useQuery({
    queryKey: ['admin', 'inventory'],
    queryFn: () => adminApi.getInventory(),
    staleTime: 15_000,
  });
}

export function useUpdateAdminInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { stock?: number; delta?: number } }) =>
      adminApi.updateInventory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.products() });
    },
  });
}

export function useAdminCustomers() {
  return useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: () => adminApi.getCustomers(),
    staleTime: 30_000,
  });
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
    staleTime: 30_000,
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, unknown>) => adminApi.updateSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'settings'], data);
    },
  });
}
