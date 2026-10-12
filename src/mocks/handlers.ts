import { HttpResponse, http } from 'msw';

import { buildMswCart } from './factories/cart';
import { mockFaker as faker } from './factories/faker';
import { brands, categories, products as catalogProducts } from './fixtures';
import { addressHandlers } from './handlers/addressHandlers';
import { authHandlers } from './handlers/authHandlers';
import { promoHandlers } from './handlers/promoHandlers';
import { checkoutHandlers } from './handlers.checkout';
import { customerOperationsHandlers } from './handlers.customerOperations';
import { favoritesHandlers } from './handlers.favorites';
import { notificationsHandlers } from './handlers.notifications';
import { paymentHandlers } from './handlers.payment';
import { pushHandlers } from './handlers.push';
import { qaHandlers } from './handlers.qa';
import { reviewsHandlers } from './handlers.reviews';
import { getProduct, listProducts } from './resolvers/catalog';
import { apiPath, type MockCart } from './utils';

import { addToCartInputSchema, updateCartItemInputSchema } from '@/lib/api/schemas';
import type { Cart as ApiCart } from '@/lib/api/types';

// Catalog data is the canonical fixture set shared with the route handler, so
// MSW and `/api/v1` serve identical product ids. The cart is MSW's own stateful
// cart; its ids and quantities come from the seeded faker.
const products = catalogProducts;

const cart: MockCart = buildMswCart(faker, products.slice(0, 2));

function recalculateCartTotals() {
  cart.subtotal.amount = cart.items.reduce(
    (total, item) => total + item.price.amount * item.quantity,
    0,
  );
  cart.itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
}

recalculateCartTotals();

(globalThis as { __tokoCartMock?: MockCart }).__tokoCartMock = cart;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Mirrors the backend pricing engine (internal/pricing/engine.go): tax is charged
// on the post-discount subtotal at the configured rate (default PRICING_TAX_RATE_BPS=1100).
const CART_TAX_BPS = 1100;

// Accepts an optional id so GET /carts/:cartId can echo the requested cart id back.
// The mock is a single shared cart, but responding with a mismatched id would break
// query-key/id consistency on the client (background refetch clobbering seeded state).
function mapCartToApiCart(id: string = cart.id): ApiCart {
  const discount = cart.discount ?? 0;
  const voucher = cart.voucher ?? null;

  const taxable = Math.max(0, cart.subtotal.amount - discount);
  const tax = Math.round((taxable * CART_TAX_BPS) / 10000);
  const shipping = 0;
  const total = taxable + tax + shipping;

  return {
    id,
    anonId: null,
    voucher: voucher,
    currency: cart.subtotal.currency,
    pricing: {
      subtotal: cart.subtotal.amount,
      discount: discount,
      tax: tax,
      shipping: shipping,
      total: total,
    },
    items: cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.name,
      slug: slugify(item.name),
      qty: item.quantity,
      unitPrice: item.price.amount,
      subtotal: item.price.amount * item.quantity,
      // null, not undefined: the server sends null for a product without a
      // thumbnail, and the mock exists to behave like the server.
      imageUrl: item.image ?? null,
    })),
  };
}
export const handlers = [
  http.get(apiPath('/categories'), () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'X-CSRF-Token=mock-csrf-token; Path=/; SameSite=Lax';
    }
    return HttpResponse.json({ data: categories });
  }),
  http.get(apiPath('/brands'), () => HttpResponse.json({ data: brands })),
  http.get(apiPath('/products'), ({ request }) =>
    HttpResponse.json(listProducts(new URL(request.url).searchParams)),
  ),
  http.get(apiPath('/products/:slug'), ({ params }) => {
    const product = getProduct(String(params.slug));
    if (!product) {
      return HttpResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return HttpResponse.json({ data: product });
  }),
  http.get(apiPath('/vouchers'), () =>
    HttpResponse.json({
      data: [
        {
          id: 'voucher-welcome10',
          code: 'WELCOME10',
          kind: 'percent',
          value: 10,
          percentBps: 1000,
          minSpend: 100000,
          usageLimit: 100,
          usedCount: 25,
          perUserLimit: 1,
          validFrom: new Date(Date.now() - 86400000).toISOString(),
          validTo: new Date(Date.now() + 30 * 86400000).toISOString(),
          combinable: true,
          priority: 1,
          productIds: [],
          categoryIds: [],
          brandIds: [],
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'voucher-save50k',
          code: 'SAVE50K',
          kind: 'fixed_amount',
          value: 50000,
          percentBps: null,
          minSpend: 250000,
          usageLimit: 50,
          usedCount: 10,
          perUserLimit: 1,
          validFrom: new Date(Date.now() - 86400000).toISOString(),
          validTo: new Date(Date.now() + 14 * 86400000).toISOString(),
          combinable: false,
          priority: 2,
          productIds: [],
          categoryIds: [],
          brandIds: [],
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }),
  ),
  http.get(apiPath('/flash-sales'), () =>
    HttpResponse.json({
      data: [
        {
          id: 'campaign-mock-active',
          name: 'Flash Sale Berlangsung',
          slug: 'flash-sale-berlangsung',
          status: 'ACTIVE',
          startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          items: [100000, 200000, 150000, 300000].map((price, index) => ({
            id: `flash-item-${index + 1}`,
            productId: `prod-${index + 1}`,
            title: `Flash Product ${index + 1}`,
            slug: `test-product-${index + 1}`,
            originalPrice: price,
            salePrice: Math.round(price * 0.8),
            discountBps: 2000,
            stock: [15, 10, 20, 5][index],
            stockLimit: [100, 20, 200, 10][index],
            soldCount: [85, 10, 180, 5][index],
            thumbnail: `/images/product${index + 1}.jpg`,
          })),
        },
        {
          id: 'campaign-mock-next',
          name: 'Campaign Payday',
          slug: 'flash-sale-berikutnya',
          status: 'SCHEDULED',
          startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endsAt: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
          items: [],
        },
      ],
    }),
  ),
  http.get(apiPath('/users/me/privacy'), () =>
    HttpResponse.json({
      data: {
        marketingEmails: true,
        orderUpdates: true,
        securityAlerts: true,
        profileVisibility: 'private',
        dataProcessing: true,
        analyticsTracking: true,
      },
    }),
  ),
  http.put(apiPath('/users/me/privacy'), async ({ request }) =>
    HttpResponse.json({ data: await request.json() }),
  ),
  http.get(apiPath('/cart'), () => HttpResponse.json(cart)),
  http.get(apiPath('/carts'), () => HttpResponse.json({ data: mapCartToApiCart() })),
  http.get(apiPath('/carts/:cartId'), ({ params }) =>
    HttpResponse.json({ data: mapCartToApiCart(String(params.cartId)) }),
  ),
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
  http.post(apiPath('/carts/:cartId/items'), async ({ params, request }) => {
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

    // Echo the requested cartId so the response id matches the client's query key.
    return HttpResponse.json({ data: mapCartToApiCart(String(params.cartId)) });
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

    return HttpResponse.json({ data: mapCartToApiCart(String(params.cartId)) });
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

    return HttpResponse.json({ data: mapCartToApiCart(String(params.cartId)) });
  }),
  http.get(apiPath('/auth/me'), () =>
    HttpResponse.json({
      data: {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        name: faker.person.fullName(),
        emailVerified: faker.datatype.boolean(),
        phone: faker.phone.number(),
        createdAt: new Date().toISOString(),
      },
    }),
  ),
  // PATCH /users/me — partial profile update, echoing back the merged user.
  http.patch(apiPath('/users/me'), async ({ request }) => {
    const body = (await request.json()) as { name?: string; phone?: string };
    return HttpResponse.json({
      data: {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        name: body.name ?? faker.person.fullName(),
        phone: body.phone,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      },
    });
  }),
  http.post(apiPath('/auth/email/verify'), async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (!body.token) {
      return HttpResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'invalid or expired token' } },
        { status: 400 },
      );
    }
    return HttpResponse.json({ data: { message: 'email verified' } });
  }),
  http.post(apiPath('/auth/email/resend'), () =>
    HttpResponse.json({ data: { message: 'verification email sent' } }),
  ),
  ...checkoutHandlers,
  ...addressHandlers,
  ...paymentHandlers,
  ...customerOperationsHandlers,
  ...favoritesHandlers,
  ...notificationsHandlers,
  ...pushHandlers,
  ...promoHandlers,
  ...reviewsHandlers,
  ...qaHandlers,
  ...authHandlers,
];
