export const queryKeys = {
  products: (params?: Record<string, unknown>) => ['products', params] as const,
  product: (slug: string) => ['product', slug] as const,
  cart: () => ['cart'] as const,
  user: () => ['user'] as const,
  paymentStatus: (orderId: string) => ['payment', 'status', orderId] as const,
};
