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
import { buildProductList } from './factories/product';
import { buildUserList } from './factories/user';

/** Bearer token that the mock API treats as an admin session. */
export const MOCK_ADMIN_TOKEN = 'mock-admin-token';

/** Cookie that scopes per-browser mock state (payments, admin edits). */
export const MOCK_SESSION_COOKIE = 'mockSessionId';

export const products = buildProductList();
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

/**
 * Admin seed stock per product index, so the low-stock card, filters and
 * badges have something to show: a few products sit at or below the default
 * threshold (5) and one is sold out. Products not listed keep the catalog stock.
 */
const ADMIN_SEED_STOCK: Record<number, number> = { 3: 4, 7: 2, 9: 5, 11: 0 };

/** Seed for the per-session admin store (see `resolvers/admin.ts`). */
export const adminProducts = products.map((product, index) => {
  const stock = ADMIN_SEED_STOCK[index];
  return buildAdminProduct(
    stock === undefined ? product : { ...product, stock, inStock: stock > 0 },
  );
});
export const adminOrders = buildAdminOrderList(products, 12);
