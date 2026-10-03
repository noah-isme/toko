/**
 * Admin query keys, namespaced under 'admin' so a single
 * invalidateQueries({ queryKey: ['admin'] }) clears the whole dashboard.
 */
export const adminKeys = {
  all: () => ['admin'] as const,
  products: (params?: object) => ['admin', 'products', params] as const,
  product: (id: string) => ['admin', 'product', id] as const,
  categories: () => ['admin', 'categories'] as const,
  brands: () => ['admin', 'brands'] as const,
  orders: (params?: object) => ['admin', 'orders', params] as const,
  order: (id: string) => ['admin', 'order', id] as const,
  orderStats: (params?: object) => ['admin', 'orders', 'stats', params] as const,
  vouchers: (params?: object) => ['admin', 'vouchers', params] as const,
  voucherStats: () => ['admin', 'vouchers', 'stats'] as const,
  flashSales: (params?: object) => ['admin', 'flash-sales', params] as const,
  flashSale: (id: string) => ['admin', 'flash-sale', id] as const,
  analyticsOverview: (range: string) => ['admin', 'analytics', 'overview', range] as const,
  auditLogs: (params?: object) => ['admin', 'audit-logs', params] as const,
  queueStats: (kind: string) => ['admin', 'queue', 'stats', kind] as const,
  deadLetters: (params?: object) => ['admin', 'queue', 'dlq', params] as const,
  webhooks: () => ['admin', 'webhooks'] as const,
  webhookDeliveries: (params?: object) => ['admin', 'webhook-deliveries', params] as const,
  inventory: () => ['admin', 'inventory'] as const,
  customers: () => ['admin', 'customers'] as const,
  settings: () => ['admin', 'settings'] as const,
  returns: () => ['admin', 'returns'] as const,
  tickets: () => ['admin', 'support', 'tickets'] as const,
  ticketMessages: (ticketId: string) =>
    ['admin', 'support', 'tickets', ticketId, 'messages'] as const,
};
