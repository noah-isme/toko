import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type {
  AdminOrderExportParams,
  AdminProductExportParams,
  BulkPriceItem,
  BulkStatusItem,
  BulkStockItem,
  ImportType,
  InventorySettings,
  StoreSettings,
} from '../types';

/**
 * Catalog writes change list rows, product details, inventory rows and the
 * dashboard low-stock counts, so refresh all of them. Prefix keys are used on
 * purpose: `adminKeys.products()` carries a trailing `undefined` that does not
 * prefix-match `['admin', 'products', params]`.
 */
export function invalidateCatalog(queryClient: QueryClient) {
  for (const queryKey of [
    ['admin', 'products'],
    ['admin', 'product'],
    ['admin', 'inventory'],
    ['admin', 'analytics'],
  ]) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

export function useBulkUpdatePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkPriceItem[]) => adminApi.bulkUpdatePrice(items),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useBulkUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkStockItem[]) => adminApi.bulkUpdateStock(items),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkStatusItem[]) => adminApi.bulkUpdateStatus(items),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useExportProductsCsv() {
  return useMutation({
    mutationFn: (params: AdminProductExportParams) => adminApi.exportProductsCsv(params),
  });
}

export function useExportOrdersCsv() {
  return useMutation({
    mutationFn: (params: AdminOrderExportParams) => adminApi.exportOrdersCsv(params),
  });
}

/** Dry runs write nothing; only a successful commit refreshes the catalog. */
export function useImportProductsCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, type, dryRun }: { file: File; type: ImportType; dryRun: boolean }) =>
      adminApi.importProductsCsv(file, type, dryRun),
    onSuccess: (result) => {
      if (!result.dryRun && result.summary.rejected === 0) invalidateCatalog(queryClient);
    },
  });
}

/** Reads `settings.inventory` defensively: the document is free-form JSON. */
export function inventorySettingsOf(settings: StoreSettings | undefined): InventorySettings {
  const raw = settings?.inventory;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as InventorySettings) : {};
}

/** Default when neither the product nor the store sets a threshold (backend `catalog.DefaultLowStockThreshold`). */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/**
 * Sets the store-wide low-stock threshold. PATCH replaces the whole
 * `inventory` document, so the other keys already stored there are sent back.
 */
export function useUpdateLowStockThreshold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threshold, current }: { threshold: number; current?: StoreSettings }) =>
      adminApi.updateSettings({
        inventory: { ...inventorySettingsOf(current), lowStockThreshold: threshold },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(adminKeys.settings(), data);
      invalidateCatalog(queryClient);
    },
  });
}
