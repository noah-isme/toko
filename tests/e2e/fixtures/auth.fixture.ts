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
      const timestamp = '2026-01-01T00:00:00.000Z';
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem(
        'cart-storage',
        JSON.stringify({ state: { cartId, anonId }, version: 0 }),
      );
      localStorage.setItem('cartId', cartId);
      localStorage.setItem(
        'toko:addresses:guest',
        JSON.stringify([
          {
            id: 'address-1',
            receiverName: 'John Jakarta',
            phone: '08123456789',
            addressLine1: 'Jl. Sudirman No. 12',
            addressLine2: 'Lt. 4',
            city: 'Jakarta',
            province: 'DKI Jakarta',
            postalCode: '10110',
            country: 'Indonesia',
            isDefault: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          {
            id: 'address-2',
            receiverName: 'Jane Bandung',
            phone: '08765432109',
            addressLine1: 'Jl. Dago No. 45',
            addressLine2: '',
            city: 'Bandung',
            province: 'Jawa Barat',
            postalCode: '40115',
            country: 'Indonesia',
            isDefault: false,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ]),
      );
      localStorage.setItem('toko:addresses:guest:default', 'address-1');
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
