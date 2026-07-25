import { type CartWithPromo } from '@/entities/cart/cache';
import type { CartView, CartViewItem } from '@/lib/api/schemas';
import type { Cart as ApiCart, CartItem as ApiCartItem } from '@/lib/api/types';

export function mapApiCartItemToCartItem(apiItem: ApiCartItem, currency: string): CartViewItem {
  return {
    id: apiItem.id,
    productId: apiItem.productId,
    name: apiItem.title,
    quantity: apiItem.qty,
    price: {
      amount: apiItem.unitPrice,
      currency,
    },
    image: apiItem.imageUrl ?? null,
  };
}

export function mapApiCartToCart(apiCart: ApiCart): CartView {
  const items = apiCart.items || [];
  const currency = apiCart.currency || 'IDR';

  const subtotalAmt = apiCart.pricing?.subtotal ?? 0;
  const discountAmt = apiCart.pricing?.discount ?? 0;
  const taxAmt = apiCart.pricing?.tax ?? 0;

  const baseCart: CartWithPromo = {
    id: apiCart.id ?? 'mock-cart-id',
    items: items.map((item) => mapApiCartItemToCartItem(item, currency)),
    subtotal: {
      amount: subtotalAmt,
      currency,
    },
    itemCount: items.reduce((acc, item) => acc + item.qty, 0),
    // Surface the server-computed tax so checkout uses the API's rate as the source of
    // truth instead of the hardcoded 11% fallback. We intentionally do NOT surface
    // `shipping`/`total` here: the cart endpoint always returns shipping=0 (see
    // toko-api internal/cart/handlers.go — pricing.Compute is called with shipping=0),
    // and its `total` excludes shipping. Checkout adds the selected courier cost itself,
    // so forwarding those would overwrite the real shipping/total with cart-level zeros.
    totals: {
      subtotal: subtotalAmt - discountAmt,
      discount: discountAmt,
      tax: taxAmt,
    },
  };

  if (apiCart.voucher || discountAmt > 0) {
    baseCart.promoInfo = {
      code: apiCart.voucher ?? '',
      discountType: 'amount',
      value: discountAmt,
      discountValue: discountAmt,
    };
  }

  return baseCart;
}
