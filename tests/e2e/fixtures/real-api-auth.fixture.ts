import { test as base, type Page } from '@playwright/test';

export interface RealApiFixtures {
  authenticatedUser: void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export async function loginWithRealApi(page: Page, email: string, password: string) {
  await page.goto('/login');

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.waitForURL('/', { timeout: 30_000 });

  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) {
    throw new Error('Failed to get access token after login');
  }

  return token;
}

export async function registerWithRealApi(
  page: Page,
  userData: {
    name: string;
    email: string;
    password: string;
  },
) {
  await page.goto('/register');

  await page.fill('input[name="name"]', userData.name);
  await page.fill('input[name="email"]', userData.email);
  await page.fill('input[name="password"]', userData.password);
  await page.fill('input[name="confirmPassword"]', userData.password);
  await page.check('input[name="acceptTerms"]');
  await page.getByRole('button', { name: 'Register', exact: true }).click();

  await page.waitForURL('/', { timeout: 30_000 });

  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) {
    throw new Error('Failed to get access token after registration');
  }

  return token;
}

export const test = base.extend<RealApiFixtures>({
  authenticatedUser: [
    async ({ page }, use) => {
      const testEmail = `test.${Date.now()}@example.com`;
      const testPassword = 'Password123!';

      await registerWithRealApi(page, {
        name: 'Test User',
        email: testEmail,
        password: testPassword,
      });

      await use();
    },
    { auto: false },
  ],
});

export { expect } from '@playwright/test';
