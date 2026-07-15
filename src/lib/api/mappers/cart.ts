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
  const shippingAmt = apiCart.pricing?.shipping ?? 0;
  const totalAmt = apiCart.pricing?.total ?? (apiCart as any).totals?.total ?? subtotalAmt;

  const baseCart: Cart = {
    id: apiCart.id ?? 'mock-cart-id',
    items: items.map((item) => mapApiCartItemToCartItem(item, currency)),
    subtotal: {
      amount: subtotalAmt,
      currency: currency,
    },
    itemCount: items.reduce((acc, item) => acc + (item.qty ?? (item as any).quantity ?? 0), 0),
  };

  if (apiCart.voucher || discountAmt > 0) {
    const v = apiCart.voucher as any;
    const voucherObj = typeof v === 'string' ? { code: v } : v;
    (baseCart as any).promoInfo = {
      code: voucherObj?.code ?? '',
      discountType: voucherObj?.discountType ?? 'amount',
      value: voucherObj?.value ?? discountAmt,
      label: voucherObj?.label,
      discountValue: discountAmt,
    };
    (baseCart as any).totals = {
      subtotal: subtotalAmt - discountAmt,
      discount: discountAmt,
      total: totalAmt,
    };
  }

  return baseCart;
}
