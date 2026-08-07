export const queryKeys = {
  products: (params?: object) => ['products', params] as const,
  product: (slug: string) => ['product', slug] as const,
  relatedProducts: (slug: string) => ['products', slug, 'related'] as const,
  frequentlyBoughtTogether: (productId: string) =>
    ['products', productId, 'frequently-bought-together'] as const,
  customersAlsoViewed: (productId: string) => ['products', productId, 'also-viewed'] as const,
  personalizedRecommendations: ['recommendations', 'personalized'] as const,
  trendingProducts: ['recommendations', 'trending'] as const,
  cart: () => ['cart'] as const,
  user: () => ['user'] as const,
  paymentStatus: (orderId: string) => ['payment', 'status', orderId] as const,
  orders: (filters?: object) => ['orders', filters] as const,
  order: (orderId: string) => ['order', orderId] as const,

  /**
   * Admin keys are namespaced under 'admin' so a single
   * invalidateQueries({ queryKey: ['admin'] }) clears the whole dashboard.
   */
  admin: {
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
  },
};
