import type { Faker } from '@faker-js/faker';

import type { MockBrand } from './brand';
import type { MockCategory } from './category';
import { MOCK_FAKER_SEED, createSeededFaker } from './faker';
import type { MockProduct } from './product';

import type {
  AdminOrder,
  AdminOrderDetail,
  AdminOrderStatus,
  AdminProductDetail,
  AdminTaxonomy,
} from '@/lib/api/services/admin';

const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const ADMIN_ORDER_STATUSES: AdminOrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

/** Admin view of a catalog product (`GET admin/products/:id`). */
export function buildAdminProduct(
  product: MockProduct,
  overrides: Partial<AdminProductDetail> = {},
): AdminProductDetail {
  const sku = `TKO-${product.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    price: product.price,
    compareAt: product.originalPrice,
    inStock: product.inStock,
    stock: product.stock,
    thumbnail: product.imageUrl,
    badges: [],
    description: product.description,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    brandId: product.brandId,
    brandName: product.brandName,
    variantCount: 1,
    sku,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    images: product.images.map((url, index) => ({
      id: `${product.id}-image-${index + 1}`,
      url,
      sortOrder: index,
    })),
    specs: [],
    variants: [
      {
        id: `${product.id}-variant-1`,
        sku,
        price: product.price,
        stock: product.stock,
        attributes: {},
      },
    ],
    ...overrides,
  };
}

export function buildAdminTaxonomy(
  entry: MockCategory | MockBrand,
  productCount: number,
  overrides: Partial<AdminTaxonomy> = {},
): AdminTaxonomy {
  return {
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    ...('description' in entry ? { parentId: null } : {}),
    productCount,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  };
}

/** One generated admin order; customer, items and dates come from the seeded faker. */
export function buildAdminOrder(
  faker: Faker,
  products: MockProduct[],
  index: number,
  overrides: Partial<AdminOrderDetail> = {},
): AdminOrderDetail {
  const status = ADMIN_ORDER_STATUSES[index % ADMIN_ORDER_STATUSES.length];
  const picked = faker.helpers.arrayElements(products, { min: 1, max: 3 });
  const items = picked.map((product, itemIndex) => {
    const qty = faker.number.int({ min: 1, max: 3 });
    return {
      id: `admin-order-${index + 1}-item-${itemIndex + 1}`,
      productId: product.id,
      variantId: `${product.id}-variant-1`,
      title: product.title,
      slug: product.slug,
      qty,
      unitPrice: product.price,
      subtotal: product.price * qty,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shipping = 15000;
  const tax = Math.round((subtotal * 1100) / 10000);
  const createdAt = faker.date.recent({ days: 30 }).toISOString();
  const customerName = faker.person.fullName();
  const shipped = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status);

  return {
    id: `admin-order-${index + 1}`,
    orderNumber: `ORD-2026-${String(index + 1).padStart(4, '0')}`,
    userId: `user-${index + 3}`,
    customerName,
    customerEmail: faker.internet.email({ firstName: customerName.split(' ')[0] }).toLowerCase(),
    status,
    paymentStatus: status === 'PENDING_PAYMENT' ? 'PENDING' : status === 'CANCELLED' ? '' : 'PAID',
    currency: 'IDR',
    total: subtotal + tax + shipping,
    subtotal,
    discount: 0,
    tax,
    shipping,
    voucherCode: null,
    itemsCount: items.reduce((sum, item) => sum + item.qty, 0),
    courier: shipped ? 'JNE' : null,
    trackingNumber: shipped ? faker.string.alphanumeric({ length: 12, casing: 'upper' }) : null,
    createdAt,
    updatedAt: createdAt,
    shippingAddress: {
      receiverName: customerName,
      phone: faker.phone.number(),
      addressLine1: faker.location.streetAddress(),
      city: faker.location.city(),
      province: faker.location.state(),
      postalCode: faker.location.zipCode(),
      country: 'Indonesia',
    },
    shippingOption: { courier: 'JNE', service: 'REG', cost: shipping },
    notes: null,
    items,
    ...overrides,
  };
}

/** `n` admin orders; the same seed always yields deep-equal orders. */
export function buildAdminOrderList(
  products: MockProduct[],
  n: number,
  seed: number = MOCK_FAKER_SEED,
): AdminOrderDetail[] {
  const faker = createSeededFaker(seed);
  return Array.from({ length: n }, (_, index) => buildAdminOrder(faker, products, index));
}

/** List row for an order (drops the detail-only fields). */
export function toAdminOrderRow(order: AdminOrderDetail): AdminOrder {
  const { shippingAddress: _a, shippingOption: _o, notes: _n, items: _i, ...row } = order;
  return row;
}
