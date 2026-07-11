export const queryKeys = {
  products: (params?: Record<string, unknown>) => ['products', params] as const,
  product: (slug: string) => ['product', slug] as const,
  relatedProducts: (slug: string) => ['products', slug, 'related'] as const,
  cart: () => ['cart'] as const,
  user: () => ['user'] as const,
  paymentStatus: (orderId: string) => ['payment', 'status', orderId] as const,
  orders: (filters?: Record<string, unknown>) => ['orders', filters] as const,
  order: (orderId: string) => ['order', orderId] as const,
};
