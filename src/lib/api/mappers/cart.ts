import { type CartWithPromo } from '@/entities/cart/cache';
import type { Cart, CartItem } from '@/lib/api/schemas';
import type { Cart as ApiCart, CartItem as ApiCartItem } from '@/lib/api/types';

export function mapApiCartItemToCartItem(apiItem: ApiCartItem, currency: string): CartItem {
  const name = apiItem.title ?? (apiItem as any).name ?? '';
  const quantity = apiItem.qty ?? (apiItem as any).quantity ?? 1;
  const priceVal =
    apiItem.unitPrice ??
    (typeof (apiItem as any).price === 'number'
      ? (apiItem as any).price
      : (apiItem as any).price?.amount) ??
    0;
  const itemCurrency = currency ?? (apiItem as any).price?.currency ?? 'IDR';
  const maxQuantity =
    (apiItem as any).availableStock !== undefined
      ? (apiItem as any).availableStock
      : (apiItem as any).maxQuantity;

  return {
    id: apiItem.id,
    productId: apiItem.productId,
    name,
    quantity,
    price: {
      amount: priceVal,
      currency: itemCurrency,
    },
    image: apiItem.imageUrl || (apiItem as any).image || null,
    maxQuantity: maxQuantity !== undefined ? Number(maxQuantity) : undefined,
  };
}

export function mapApiCartToCart(apiCart: ApiCart): Cart {
  const items = apiCart.items || [];
  const currency = apiCart.currency || 'IDR';

  // Fallback for pricing
  const subtotalAmt = apiCart.pricing?.subtotal ?? (apiCart as any).totals?.subtotal ?? 0;
  const discountAmt = apiCart.pricing?.discount ?? (apiCart as any).totals?.discount ?? 0;
  const taxAmt = apiCart.pricing?.tax ?? 0;

  const baseCart: CartWithPromo = {
    id: apiCart.id ?? 'mock-cart-id',
    items: items.map((item) => mapApiCartItemToCartItem(item, currency)),
    subtotal: {
      amount: subtotalAmt,
      currency: currency,
    },
    itemCount: items.reduce((acc, item) => acc + (item.qty ?? (item as any).quantity ?? 0), 0),
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
