import type { Faker } from '@faker-js/faker';

import type { MockCart } from '../utils';

import type { MockProduct } from './product';

/** Cart line as served by the route handler (`carts/*`). */
export type RouteCartItem = {
  id: string;
  productId: string;
  title: string;
  qty: number;
  unitPrice: number;
  imageUrl: string;
  maxQuantity: number;
};

export type RouteCart = { id: string; items: RouteCartItem[]; itemCount: number };

/** The route handler's fixed cart: one of each of the given products. */
export function buildCart(products: MockProduct[], overrides: Partial<RouteCart> = {}): RouteCart {
  const items = products.map((product, index) => ({
    id: `cart-item-${index + 1}`,
    productId: product.id,
    title: product.title,
    qty: 1,
    unitPrice: product.price,
    imageUrl: product.imageUrl,
    maxQuantity: 20,
  }));
  return { id: 'cart-123', items, itemCount: items.length, ...overrides };
}

/** The stateful MSW cart. Ids and quantities come from the seeded faker. */
export function buildMswCart(faker: Faker, products: MockProduct[]): MockCart {
  return {
    id: faker.string.uuid(),
    items: products.map((product) => ({
      id: faker.string.uuid(),
      productId: product.id,
      name: product.title,
      quantity: faker.number.int({ min: 1, max: 3 }),
      price: { amount: product.price, currency: product.currency },
      image: product.imageUrl ?? null,
      maxQuantity: Math.max(1, product.stock),
    })),
    subtotal: { amount: 0, currency: 'IDR' },
    itemCount: 0,
  };
}
