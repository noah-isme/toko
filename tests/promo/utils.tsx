import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getCartQueryKey } from '@/entities/cart/cache';
import { queryKeys } from '@/lib/api/queryKeys';
import type { Cart } from '@/lib/api/schemas';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

export function createTestCart(cartId = 'cart-123'): Cart {
  return {
    id: cartId,
    items: [],
    subtotal: { amount: 200000, currency: 'IDR' },
    itemCount: 0,
  };
}

export function seedCart(queryClient: QueryClient, cart: Cart) {
  queryClient.setQueryData(queryKeys.cart(), cart);
  queryClient.setQueryData(getCartQueryKey(cart.id), cart);
}

export function withQueryClient(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
