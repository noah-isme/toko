import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { checkoutHandlers } from './handlers.checkout';

import { addToCartInputSchema, Cart, Product } from '@/lib/api/schemas';


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

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
  http.get(`${API_URL}/products`, () => HttpResponse.json(products)),
  http.get(`${API_URL}/products/:slug`, ({ params }) => {
    const product = products.find((item) => item.slug === params.slug);
    if (!product) {
      return HttpResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return HttpResponse.json(product);
  }),
  http.get(`${API_URL}/cart`, () => HttpResponse.json(cart)),
  http.post(`${API_URL}/cart/items`, async ({ request }) => {
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
    } else {
      cart.items.push({
        id: faker.string.uuid(),
        productId,
        name: product.name,
        quantity: safeQuantity,
        price: product.price,
        image: product.images[0] ?? null,
      });
    }

    recalculateCartTotals();

    return HttpResponse.json(cart);
  }),
  http.get(`${API_URL}/auth/me`, () =>
    HttpResponse.json({
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
    }),
  ),
  ...checkoutHandlers,
];
