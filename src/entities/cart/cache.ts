import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/queryKeys';
import type { Cart, CartItem } from '@/lib/api/schemas';

export function getCartQueryKey(cartId?: string) {
  if (cartId) {
    return [...queryKeys.cart(), cartId] as const;
  }

  return queryKeys.cart();
}

export function readCartCache(queryClient: QueryClient, cartId?: string) {
  if (cartId) {
    const keyedCart = queryClient.getQueryData<Cart>(getCartQueryKey(cartId));
    if (keyedCart) {
      return keyedCart;
    }
  }

  return queryClient.getQueryData<Cart>(queryKeys.cart());
}

export function writeCartCache(
  queryClient: QueryClient,
  cartId: string | undefined,
  data: Cart | undefined,
) {
  queryClient.setQueryData(queryKeys.cart(), data);

  if (cartId) {
    queryClient.setQueryData(getCartQueryKey(cartId), data);
  }
}

export function patchCartItems(cart: Cart, patch: (items: CartItem[]) => CartItem[]) {
  const nextItems = patch(cart.items.map((item) => ({ ...item })));

  const subtotalAmount = nextItems.reduce(
    (total, item) => total + item.price.amount * item.quantity,
    0,
  );
  const itemCount = nextItems.reduce((total, item) => total + item.quantity, 0);

  return {
    ...cart,
    items: nextItems,
    subtotal: { ...cart.subtotal, amount: subtotalAmount },
    itemCount,
  } satisfies Cart;
}
