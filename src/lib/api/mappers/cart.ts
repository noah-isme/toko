
import type { Cart as ApiCart, CartItem as ApiCartItem } from '@/lib/api/types';
import type { Cart, CartItem } from '@/lib/api/schemas';

export function mapApiCartItemToCartItem(apiItem: ApiCartItem, currency: string): CartItem {
    return {
        id: apiItem.id,
        productId: apiItem.productId,
        name: apiItem.title,
        quantity: apiItem.qty,
        price: {
            amount: apiItem.unitPrice,
            currency: currency,
        },
        image: apiItem.imageUrl || null,
        maxQuantity: undefined, // Optional in frontend schema, missing in backend type
    };
}

export function mapApiCartToCart(apiCart: ApiCart): Cart {
    const baseCart = {
        id: apiCart.id,
        items: apiCart.items.map((item) => mapApiCartItemToCartItem(item, apiCart.currency)),
        subtotal: {
            amount: apiCart.pricing.subtotal,
            currency: apiCart.currency,
        },
        itemCount: apiCart.items.reduce((acc, item) => acc + item.qty, 0),
    };

    if (apiCart.voucher) {
        (baseCart as any).promoInfo = {
            code: apiCart.voucher.code,
            discountType: apiCart.voucher.discountType,
            value: apiCart.voucher.value,
            label: apiCart.voucher.label,
            discountValue: apiCart.pricing.discount,
        };
        (baseCart as any).totals = {
            subtotal: apiCart.pricing.subtotal - apiCart.pricing.discount,
            discount: apiCart.pricing.discount,
            total: apiCart.pricing.total,
        };
    }

    return baseCart;
}
