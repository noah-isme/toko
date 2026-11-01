/**
 * Canonical mock dataset, built once per module instance and shared by the
 * in-process route handler (`src/mocks/route.ts`), the MSW handlers and the
 * E2E fixtures. Everything here is deterministic: curated values come from
 * `data.ts`, and anything generated uses a seeded faker.
 */
import { buildAddressList } from './factories/address';
import { buildAdminOrderList, buildAdminProduct } from './factories/admin';
import { buildBrandList } from './factories/brand';
import { buildCart } from './factories/cart';
import { buildCategoryList } from './factories/category';
import { buildProduct, buildProductList, stableUuid } from './factories/product';
import { buildUserList } from './factories/user';

/** Bearer token that the mock API treats as an admin session. */
export const MOCK_ADMIN_TOKEN = 'mock-admin-token';

/** Cookie that scopes per-browser mock state (payments, admin edits). */
export const MOCK_SESSION_COOKIE = 'mockSessionId';

export const products = buildProductList();

/**
 * A sold-out product for manual and mobile QA of "Notify me when available"
 * (`/products/sold-out-demo`). It is served by the product detail endpoint
 * and accepted by the alerts endpoints, but kept out of `products` so
 * listings, counts and golden snapshots are unchanged.
 */
export const SOLD_OUT_DEMO_SLUG = 'sold-out-demo';
export const soldOutDemoProduct = buildProduct(undefined, {
  id: stableUuid(SOLD_OUT_DEMO_SLUG),
  slug: SOLD_OUT_DEMO_SLUG,
  title: 'MacBook Pro 14 M3 (Sold-out demo)',
  stock: 0,
  inStock: false,
});
export const categories = buildCategoryList();
export const brands = buildBrandList();

/** The route handler's cart: the first two catalog products, one each. */
export const defaultCart = buildCart(products.slice(0, 2));

export const addresses = buildAddressList();

export const shippingRates = [
  { service: 'REG', description: 'Regular Service', cost: 15000, etd: '2-3 days', note: '' },
  { service: 'YES', description: 'Yakin Esok Sampai', cost: 35000, etd: '1 day', note: '' },
];

export const users = buildUserList();

/** Seed for the per-session admin store (see `resolvers/admin.ts`). */
export const adminProducts = products.map((product) => buildAdminProduct(product));
export const adminOrders = buildAdminOrderList(products, 12);
