import type { QueryClient } from '@tanstack/react-query';

import type { Promo } from '@/entities/promo/types';
import { queryKeys } from '@/lib/api/queryKeys';
import type { Cart, CartItem } from '@/lib/api/schemas';

export type CartTotalsPreview = {
  subtotal?: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  total?: number;
};

export type CartPromoInfo = Promo & {
  discountValue?: number;
  message?: string;
};

export type CartWithPromo = Cart & {
  promoInfo?: CartPromoInfo;
  totals?: CartTotalsPreview;
};

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

export function cloneCartWithMeta(source: Cart): CartWithPromo {
  const cartWithMeta = source as CartWithPromo;
  return {
    ...source,
    items: source.items.map((item) => ({ ...item })),
    promoInfo: cartWithMeta.promoInfo ? { ...cartWithMeta.promoInfo } : undefined,
    totals: cartWithMeta.totals ? { ...cartWithMeta.totals } : undefined,
  };
}

export function updateCartCache(
  queryClient: QueryClient,
  cartId: string | undefined,
  updater: (draft: CartWithPromo) => CartWithPromo,
) {
  const current = readCartCache(queryClient, cartId);
  if (!current) {
    return undefined;
  }

  const draft = cloneCartWithMeta(current);
  const next = updater(draft);
  writeCartCache(queryClient, cartId, next);
  return next;
}
