export const queryKeys = {
  products: (filters?: Record<string, unknown>) => ["products", filters ?? {}],
  product: (slug: string) => ["product", slug],
  cart: () => ["cart"],
} as const;
