import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { addressHandlers } from './handlers/addressHandlers';
import { promoHandlers } from './handlers/promoHandlers';
import { checkoutHandlers } from './handlers.checkout';
import { favoritesHandlers } from './handlers.favorites';
import { paymentHandlers } from './handlers.payment';
import { reviewsHandlers } from './handlers.reviews';
import { apiPath } from './utils';

import { addToCartInputSchema, updateCartItemInputSchema, Cart, Product } from '@/lib/api/schemas';

function createProduct(): Product {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
    description: faker.commerce.productDescription(),
    price: {
      amount: Number(faker.commerce.price({ min: 10, max: 800, dec: 2 })),
      currency: 'USD',
    },
    images: Array.from({ length: 3 }, () => faker.image.urlLoremFlickr({ category: 'product' })),
    rating: Number(faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 })),
    reviewCount: faker.number.int({ min: 10, max: 1200 }),
    inventory: faker.number.int({ min: 0, max: 50 }),
    categories: faker.helpers.arrayElements([
      'electronics',
      'fashion',
      'home',
      'beauty',
      'sports',
      'outdoor',
    ]),
  };
}

const products = Array.from({ length: 16 }, () => createProduct());

const cart: Cart = {
  id: faker.string.uuid(),
  items: products.slice(0, 2).map((product) => ({
    id: faker.string.uuid(),
    productId: product.id,
    name: product.name,
    quantity: faker.number.int({ min: 1, max: 3 }),
    price: product.price,
    image: product.images[0] ?? null,
    maxQuantity: Math.max(1, product.inventory),
  })),
  subtotal: { amount: 0, currency: 'USD' },
  itemCount: 0,
};

function recalculateCartTotals() {
  cart.subtotal.amount = cart.items.reduce(
    (total, item) => total + item.price.amount * item.quantity,
    0,
  );
  cart.itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
}

recalculateCartTotals();

(globalThis as { __tokoCartMock?: Cart }).__tokoCartMock = cart;

export const handlers = [
  http.get(apiPath('/products'), () => HttpResponse.json(products)),
  http.get(apiPath('/products/:slug'), ({ params }) => {
    const product = products.find((item) => item.slug === params.slug);
    if (!product) {
      return HttpResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return HttpResponse.json(product);
  }),
  http.get(apiPath('/cart'), () => HttpResponse.json(cart)),
  http.post(apiPath('/cart/items'), async ({ request }) => {
    const payload = await request.json();
    const parsed = addToCartInputSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        { message: 'Invalid cart payload', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { productId, quantity } = parsed.data;
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return HttpResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    if (product.inventory <= 0) {
      return HttpResponse.json({ message: 'Product is out of stock' }, { status: 409 });
    }

    const existingItem = cart.items.find((item) => item.productId === productId);
    const maxQuantity = Math.max(1, product.inventory);
    const safeQuantity = Math.min(quantity, maxQuantity);

    if (existingItem) {
      existingItem.quantity = Math.min(existingItem.quantity + safeQuantity, maxQuantity);
      existingItem.maxQuantity = maxQuantity;
    } else {
      cart.items.push({
        id: faker.string.uuid(),
        productId,
        name: product.name,
        quantity: safeQuantity,
        price: product.price,
        image: product.images[0] ?? null,
        maxQuantity,
      });
    }

    recalculateCartTotals();

    return HttpResponse.json(cart);
  }),
  http.patch(apiPath('/cart/items/:itemId'), async ({ params, request }) => {
    const payload = await request.json();
    const parsed = updateCartItemInputSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        { message: 'Invalid cart payload', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const itemId = params.itemId as string;
    const targetItem = cart.items.find((item) => item.id === itemId);

    if (!targetItem) {
      return HttpResponse.json({ message: 'Cart item not found' }, { status: 404 });
    }

    const product = products.find((item) => item.id === targetItem.productId);
    const maxQuantity = Math.max(1, product?.inventory ?? targetItem.maxQuantity ?? 1);

    targetItem.quantity = Math.min(Math.max(parsed.data.quantity, 1), maxQuantity);
    targetItem.maxQuantity = maxQuantity;

    recalculateCartTotals();

    return HttpResponse.json(cart);
  }),
  http.delete(apiPath('/cart/items/:itemId'), ({ params }) => {
    const itemId = params.itemId as string;
    const initialLength = cart.items.length;
    cart.items = cart.items.filter((item) => item.id !== itemId);

    if (cart.items.length === initialLength) {
      return HttpResponse.json({ message: 'Cart item not found' }, { status: 404 });
    }

    recalculateCartTotals();

    return HttpResponse.json(cart);
  }),
  http.get(apiPath('/auth/me'), () =>
    HttpResponse.json({
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
    }),
  ),
  ...checkoutHandlers,
  ...addressHandlers,
  ...paymentHandlers,
  ...favoritesHandlers,
  ...promoHandlers,
  ...reviewsHandlers,
];
