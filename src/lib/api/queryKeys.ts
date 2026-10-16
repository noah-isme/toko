export const queryKeys = {
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
};
