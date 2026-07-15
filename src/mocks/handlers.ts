import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { SEED_BRANDS, SEED_CATEGORIES, SEED_PRODUCTS } from './data';
import { addressHandlers } from './handlers/addressHandlers';
import { authHandlers } from './handlers/authHandlers';
import { promoHandlers } from './handlers/promoHandlers';
import { checkoutHandlers } from './handlers.checkout';
import { favoritesHandlers } from './handlers.favorites';
import { paymentHandlers } from './handlers.payment';
import { reviewsHandlers } from './handlers.reviews';
import { apiPath } from './utils';

import { addToCartInputSchema, updateCartItemInputSchema, Cart, Product } from '@/lib/api/schemas';
import type { Cart as ApiCart } from '@/lib/api/types';

function createProduct(): Product {
  const stock = faker.number.int({ min: 0, max: 50 });
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
    description: faker.commerce.productDescription(),
    price: Number(faker.commerce.price({ min: 100000, max: 50000000, dec: 0 })),
    currency: 'IDR',
    imageUrl: faker.image.urlLoremFlickr({ category: 'product' }),
    images: Array.from({ length: 3 }, () => faker.image.urlLoremFlickr({ category: 'product' })),
    rating: Number(faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 })),
    reviewCount: faker.number.int({ min: 10, max: 1200 }),
    stock: stock,
    inStock: stock > 0,
    tags: faker.helpers.arrayElements([
      'electronics',
      'fashion',
      'home',
      'beauty',
      'sports',
      'outdoor',
    ]),
  };
}

// Map products to match API Contract v0.2.0
const products: Product[] = SEED_PRODUCTS.map((p) => {
  const category = SEED_CATEGORIES.find((c) => c.slug === p.category);
  const brand = SEED_BRANDS.find((b) => b.slug === p.brand);
  const stock = faker.number.int({ min: 10, max: 50 });

  return {
    id: faker.string.uuid(),
    title: p.title,
    slug: p.slug,
    description: faker.commerce.productDescription(),
    price: p.price,
    originalPrice: p.price * 1.2, // 20% higher original price
    discountPercent: 20,
    currency: 'IDR',
    categoryId: category?.id || p.category,
    categoryName: category?.name || p.category,
    brandId: brand?.id || p.brand,
    brandName: brand?.name || p.brand,
    imageUrl: p.thumbnail, // Primary image
    images: [
      p.thumbnail,
      faker.image.urlLoremFlickr({ category: 'product' }),
      faker.image.urlLoremFlickr({ category: 'product' }),
    ],
    stock: stock,
    inStock: stock > 0,
    rating: Number(faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 })),
    reviewCount: faker.number.int({ min: 10, max: 1200 }),
    tags: ['new', p.category],
    createdAt: new Date().toISOString(),
  };
});

const cart: Cart = {
  id: faker.string.uuid(),
  items: products.slice(0, 2).map((product) => ({
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

function recalculateCartTotals() {
  cart.subtotal.amount = cart.items.reduce(
    (total, item) => total + item.price.amount * item.quantity,
    0,
  );
  cart.itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
}

recalculateCartTotals();

(globalThis as { __tokoCartMock?: Cart }).__tokoCartMock = cart;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapCartToApiCart(): ApiCart {
  const discount = (cart as any).discount || 0;
  const voucher = (cart as any).voucher || null;

  return {
    id: cart.id,
    anonId: null,
    voucher: voucher,
    currency: cart.subtotal.currency,
    pricing: {
      subtotal: cart.subtotal.amount,
      discount: discount,
      tax: 0,
      shipping: 0,
      total: Math.max(0, cart.subtotal.amount - discount),
    },
    items: cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.name,
      slug: slugify(item.name),
      qty: item.quantity,
      unitPrice: item.price.amount,
      subtotal: item.price.amount * item.quantity,
      imageUrl: item.image ?? undefined,
    })),
  };
}

export const handlers = [
  http.get(apiPath('/categories'), () => HttpResponse.json({ data: SEED_CATEGORIES })),
  http.get(apiPath('/brands'), () => HttpResponse.json({ data: SEED_BRANDS })),
  http.get(apiPath('/products'), ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const brand = url.searchParams.get('brand');
    const q = url.searchParams.get('q');

    let filtered = products;

    if (category) {
      filtered = filtered.filter(
        (p) =>
          p.categoryId === category || p.categoryName?.toLowerCase() === category.toLowerCase(),
      );
    }

    if (brand) {
      filtered = filtered.filter(
        (p) => p.brandId === brand || p.brandName?.toLowerCase() === brand.toLowerCase(),
      );
    }

    if (q) {
      const lowerQ = q.toLowerCase();
      filtered = filtered.filter((p) => p.title.toLowerCase().includes(lowerQ));
    }

    return HttpResponse.json({
      data: filtered,
      pagination: { page: 1, perPage: 20, totalItems: filtered.length },
    });
  }),
  http.get(apiPath('/products/:slug'), ({ params }) => {
    const product = products.find((item) => item.slug === params.slug);
    if (!product) {
      return HttpResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return HttpResponse.json({ data: product });
  }),
  http.get(apiPath('/cart'), () => HttpResponse.json(cart)),
  http.get(apiPath('/carts'), () => HttpResponse.json({ data: mapCartToApiCart() })),
  http.get(apiPath('/carts/:cartId'), () => HttpResponse.json({ data: mapCartToApiCart() })),
  http.get(apiPath('/orders/:orderId/shipment'), ({ params }) =>
    HttpResponse.json({
      data: {
        orderId: params.orderId,
        trackingNumber: faker.string.alphanumeric(12).toUpperCase(),
        courier: 'JNE',
        service: 'REG',
        status: 'in_transit',
        statusLabel: 'Dalam Perjalanan',
        estimatedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
        shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        tracking: [
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
            status: 'picked_up',
            location: 'Jakarta',
            description: 'Paket diambil oleh kurir.',
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            status: 'in_transit',
            location: 'Bandung',
            description: 'Paket dalam perjalanan ke kota tujuan.',
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            status: 'on_delivery',
            location: 'Bandung',
            description: 'Paket sedang diantar ke alamat tujuan.',
          },
        ],
      },
    }),
  ),
  http.post(apiPath('/cart/items'), async ({ request }) => {
    const payload = await request.json();
    const parsed = addToCartInputSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        { message: 'Invalid cart payload', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { productId, qty } = parsed.data;
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return HttpResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    if (!product.inStock || product.stock <= 0) {
      return HttpResponse.json({ message: 'Product is out of stock' }, { status: 409 });
    }

    const existingItem = cart.items.find((item) => item.productId === productId);
    const maxQuantity = Math.max(1, product.stock);
    const safeQuantity = Math.min(qty, maxQuantity);

    if (existingItem) {
      existingItem.quantity = Math.min(existingItem.quantity + safeQuantity, maxQuantity);
      existingItem.maxQuantity = maxQuantity;
    } else {
      cart.items.push({
        id: faker.string.uuid(),
        productId,
        name: product.title,
        quantity: safeQuantity,
        price: { amount: product.price, currency: 'IDR' },
        image: product.imageUrl ?? null,
        maxQuantity,
      });
    }

    recalculateCartTotals();

    return HttpResponse.json(cart);
  }),
  http.post(apiPath('/carts/:cartId/items'), async ({ request }) => {
    const payload = await request.json();
    const parsed = addToCartInputSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        { message: 'Invalid cart payload', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { productId, qty } = parsed.data;
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return HttpResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    if (!product.inStock || product.stock <= 0) {
      return HttpResponse.json({ message: 'Product is out of stock' }, { status: 409 });
    }

    const existingItem = cart.items.find((item) => item.productId === productId);
    const maxQuantity = Math.max(1, product.stock);
    const safeQuantity = Math.min(qty, maxQuantity);

    if (existingItem) {
      existingItem.quantity = Math.min(existingItem.quantity + safeQuantity, maxQuantity);
      existingItem.maxQuantity = maxQuantity;
    } else {
      cart.items.push({
        id: faker.string.uuid(),
        productId,
        name: product.title,
        quantity: safeQuantity,
        price: { amount: product.price, currency: product.currency },
        image: product.imageUrl ?? null,
        maxQuantity,
      });
    }

    recalculateCartTotals();

    return HttpResponse.json({ data: mapCartToApiCart() });
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
    const maxQuantity = Math.max(1, product?.stock ?? targetItem.maxQuantity ?? 1);

    targetItem.quantity = Math.min(Math.max(parsed.data.qty, 1), maxQuantity);
    targetItem.maxQuantity = maxQuantity;

    recalculateCartTotals();

    return HttpResponse.json(cart);
  }),
  http.patch(apiPath('/carts/:cartId/items/:itemId'), async ({ params, request }) => {
    const payload = await request.json();
    const parsed = updateCartItemInputSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        { message: 'Invalid cart payload', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { itemId } = params;
    const item = cart.items.find((entry) => entry.id === itemId);

    if (!item) {
      return HttpResponse.json({ message: 'Cart item not found' }, { status: 404 });
    }

    item.quantity = parsed.data.qty;

    if (item.maxQuantity && item.quantity > item.maxQuantity) {
      item.quantity = item.maxQuantity;
    }

    if (item.quantity < 1) {
      item.quantity = 1;
    }

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
  http.delete(apiPath('/carts/:cartId/items/:itemId'), ({ params }) => {
    const { itemId } = params;
    const itemIndex = cart.items.findIndex((entry) => entry.id === itemId);

    if (itemIndex === -1) {
      return HttpResponse.json({ message: 'Cart item not found' }, { status: 404 });
    }

    cart.items.splice(itemIndex, 1);
    recalculateCartTotals();

    return HttpResponse.json(cart);
  }),
  http.get(apiPath('/auth/me'), () =>
    HttpResponse.json({
      data: {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        name: faker.person.fullName(),
        emailVerified: faker.datatype.boolean(),
        phone: faker.phone.number(),
      },
    }),
  ),
  ...checkoutHandlers,
  ...addressHandlers,
  ...paymentHandlers,
  ...favoritesHandlers,
  ...promoHandlers,
  ...reviewsHandlers,
  ...authHandlers,
];
