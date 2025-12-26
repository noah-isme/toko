
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
    return {
        id: apiCart.id,
        items: apiCart.items.map((item) => mapApiCartItemToCartItem(item, apiCart.currency)),
        subtotal: {
            amount: apiCart.pricing.subtotal,
            currency: apiCart.currency,
        },
        itemCount: apiCart.items.reduce((acc, item) => acc + item.qty, 0),
    };
}
