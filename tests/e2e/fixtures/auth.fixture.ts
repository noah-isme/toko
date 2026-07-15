import { test as base, type Page } from '@playwright/test';

export const E2E_ACCESS_TOKEN = 'mock-token';
export const E2E_CART_ID = 'cart-123';
export const E2E_ANON_ID = 'anon-e2e-seed';

type AuthFixtures = {
  seededSession: void;
};

export async function installSeededSession(page: Page) {
  await page.addInitScript(
    ({ accessToken, cartId, anonId }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem(
        'cart-storage',
        JSON.stringify({ state: { cartId, anonId }, version: 0 }),
      );
      localStorage.setItem('cartId', cartId);
    },
    {
      accessToken: E2E_ACCESS_TOKEN,
      cartId: E2E_CART_ID,
      anonId: E2E_ANON_ID,
    },
  );
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
