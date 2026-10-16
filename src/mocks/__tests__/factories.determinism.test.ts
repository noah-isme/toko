// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildAddressList } from '../factories/address';
import { buildAdminOrderList, buildAdminProduct } from '../factories/admin';
import { buildMswCart } from '../factories/cart';
import { createSeededFaker } from '../factories/faker';
import { buildProductList, stableUuid } from '../factories/product';
import { buildUserList } from '../factories/user';
import * as fixtures from '../fixtures';

describe('mock factories', () => {
  it('build deep-equal data on every call', () => {
    expect(buildProductList()).toEqual(buildProductList());
    expect(buildAddressList()).toEqual(buildAddressList());
    expect(buildUserList()).toEqual(buildUserList());
    const products = buildProductList();
    expect(buildAdminOrderList(products, 8, 42)).toEqual(buildAdminOrderList(products, 8, 42));
    expect(buildMswCart(createSeededFaker(7), products.slice(0, 2))).toEqual(
      buildMswCart(createSeededFaker(7), products.slice(0, 2)),
    );
  });

  it('produces different generated data for a different seed', () => {
    const products = buildProductList();
    expect(buildAdminOrderList(products, 4, 1)).not.toEqual(buildAdminOrderList(products, 4, 2));
  });

  it('keeps slug-derived product ids', () => {
    for (const product of fixtures.products) {
      expect(product.id).toBe(stableUuid(product.slug));
    }
    expect(new Set(fixtures.products.map((p) => p.id)).size).toBe(fixtures.products.length);
  });

  it('matches the recorded first three products', () => {
    expect(buildProductList(3)).toMatchSnapshot();
  });

  it('derives admin products and seeded admin orders from the catalog', () => {
    expect(fixtures.adminProducts[0]).toEqual(buildAdminProduct(fixtures.products[0]));
    expect(fixtures.adminOrders).toHaveLength(12);
    for (const order of fixtures.adminOrders) {
      const productIds = new Set(fixtures.products.map((p) => p.id));
      expect(order.items.every((item) => productIds.has(item.productId!))).toBe(true);
      expect(order.total).toBe(order.subtotal + order.tax + order.shipping - order.discount);
    }
  });

  it('gives users their seed roles', () => {
    const roles = new Set(fixtures.users.flatMap((user) => user.roles));
    expect(roles).toEqual(new Set(['admin', 'customer']));
  });
});
