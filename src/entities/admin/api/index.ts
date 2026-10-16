/**
 * Admin API client.
 *
 * Mirrors the `/api/v1/admin/*` routes registered in toko-api. Every call here
 * requires an authenticated admin session: the backend applies RequireAuth plus
 * a role check, so a non-admin token gets 403.
 *
 * Money values are integers in minor currency units (IDR has no subunit in this
 * store, so they are plain rupiah).
 */
import { adminAnalyticsApi } from './analytics';
import { adminAuditLogsApi } from './audit-logs';
import { adminCustomersApi } from './customers';
import { adminFlashSalesApi } from './flash-sales';
import { adminInventoryApi } from './inventory';
import { adminOrdersApi } from './orders';
import { adminProductsApi } from './products';
import { adminQueueApi } from './queue';
import { adminSettingsApi } from './settings';
import { adminTaxonomyApi } from './taxonomy';
import { adminVouchersApi } from './vouchers';
import { adminWebhooksApi } from './webhooks';

export { adminOperationsApi } from '@/lib/api/services/customerOperations';

export const adminApi = {
  ...adminProductsApi,
  ...adminTaxonomyApi,
  ...adminOrdersApi,
  ...adminVouchersApi,
  ...adminFlashSalesApi,
  ...adminAnalyticsApi,
  ...adminWebhooksApi,
  ...adminQueueApi,
  ...adminAuditLogsApi,
  ...adminInventoryApi,
  ...adminCustomersApi,
  ...adminSettingsApi,
};
