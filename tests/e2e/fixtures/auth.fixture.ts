import { test as base, type Page } from '@playwright/test';

import { MOCK_ADMIN_TOKEN, addresses as SEED_ADDRESSES } from '@/mocks/fixtures';

export const E2E_ACCESS_TOKEN = 'mock-token';
export const E2E_CART_ID = 'cart-123';
export const E2E_ANON_ID = 'anon-e2e-seed';

type AuthFixtures = {
  seededSession: void;
};

export async function installSeededSession(page: Page) {
  await page.addInitScript(
    ({ accessToken, cartId, anonId, addresses }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem(
        'cart-storage',
        JSON.stringify({ state: { cartId, anonId }, version: 0 }),
      );
      localStorage.setItem('cartId', cartId);
      localStorage.setItem('toko:addresses:guest', JSON.stringify(addresses));
      localStorage.setItem('toko:addresses:guest:default', 'address-1');
    },
    {
      accessToken: E2E_ACCESS_TOKEN,
      cartId: E2E_CART_ID,
      anonId: E2E_ANON_ID,
      // The same address book the mock API serves (ids and values).
      addresses: SEED_ADDRESSES,
    },
  );
}

/**
 * Signs the page in as the mock admin: `auth/me` answers with `roles: ['admin']`
 * for this token and the mock API's `admin/*` endpoints accept it.
 */
export async function installAdminSession(page: Page) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem('accessToken', accessToken);
  }, MOCK_ADMIN_TOKEN);
}

export const test = base.extend<AuthFixtures>({
  seededSession: [
    async ({ page }, use) => {
      await installSeededSession(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
