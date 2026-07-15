import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const generateUser = () => {
    const timestamp = Date.now();
    return {
      name: `Test User ${timestamp}`,
      email: `test.user.${timestamp}@example.com`,
      password: 'Password123!',
    };
  };

  test('should show validation errors on invalid login submission', async ({ page }) => {
    await page.goto('/login');

    // Bypass native HTML5 required validation
    await page.evaluate(() => document.querySelector('form')?.setAttribute('novalidate', 'true'));

    // Explicitly target the login form's sign-in submit button
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.locator('#email-error')).toBeVisible();
    await expect(page.locator('#password-error')).toBeVisible();

    await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.locator('form [role="alert"]')).toBeVisible();
  });

  test('should allow a new user to register and auto-login', async ({ page }) => {
    const user = generateUser();

    await page.goto('/register');

    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);

    await page.check('input[name="acceptTerms"]');

    await page.getByRole('button', { name: 'Register', exact: true }).click();

    await expect(page).toHaveURL('/');

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
  });

  test('should allow an existing user to login and verify persistence', async ({ page }) => {
    const user = generateUser();

    await page.goto('/register');
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.check('input[name="acceptTerms"]');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page).toHaveURL('/');

    await page.reload();
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
  });

  test('should validate password mismatch on register', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Test Mismatch');
    await page.fill('input[name="email"]', 'mismatch@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Mismatch123!');
    await page.check('input[name="acceptTerms"]');

    // Submit form to trigger validation errors
    await page.getByRole('button', { name: 'Register', exact: true }).click();

    await expect(page.locator('#confirm-password-error')).toContainText(/cocok|match/i);
  });
});
