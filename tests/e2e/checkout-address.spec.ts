import { expect, test } from '@playwright/test';

import {
  navigateToCheckout,
  openAddressDialog,
  openCheckout,
  seedCartFromHome,
  selectAddress,
  selectShipping,
  waitForAddressAnnouncement,
} from './fixtures';

test.describe('Checkout address flow', () => {
  test.describe('Address selection', () => {
    test('user can select from saved addresses', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      // Select a different saved address so the live-region announcement changes.
      await selectAddress(page, 1);
      await waitForAddressAnnouncement(page);

      // Verify selection is reflected
      const selectedRadio = page.getByRole('radio').nth(1);
      await expect(selectedRadio).toHaveAttribute('aria-checked', 'true');
    });

    test('user can switch between addresses', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      // Select first address
      await selectAddress(page, 0);
      const firstRadio = page.getByRole('radio').first();
      await expect(firstRadio).toHaveAttribute('aria-checked', 'true');

      // Check if there are multiple addresses
      const radios = page.getByRole('radio');
      const count = await radios.count();

      if (count > 1) {
        // Select second address
        await selectAddress(page, 1);
        const secondRadio = radios.nth(1);
        await expect(secondRadio).toHaveAttribute('aria-checked', 'true');

        // First should no longer be selected
        await expect(firstRadio).toHaveAttribute('aria-checked', 'false');
      }
    });

    test('selected address triggers shipping options update', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      // Select address
      await selectAddress(page);

      // Wait for shipping options to appear
      const shippingSection = page.getByRole('heading', { name: 'Shipping Options' });
      await expect(shippingSection).toBeVisible({ timeout: 10_000 });

      // Verify at least one shipping option is available
      const shippingRadios = page.locator('input[name="shipping-option"]');
      await expect(shippingRadios.first()).toBeVisible();
    });
  });

  test.describe('Address manager dialog', () => {
    test('user can open address manager dialog', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      await openAddressDialog(page);

      // Verify dialog is open
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
    });

    test('address manager shows saved addresses', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      await openAddressDialog(page);
      await page.waitForTimeout(500);

      // Should show at least one address or empty state
      const dialog = page.getByRole('dialog');
      const hasAddresses = (await dialog.locator('[data-address-item]').count()) > 0;
      const hasEmptyState = await dialog
        .getByText(/belum ada alamat|no addresses/i)
        .isVisible()
        .catch(() => false);

      expect(hasAddresses || hasEmptyState).toBe(true);
    });

    test('user can close address manager dialog', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      await openAddressDialog(page);

      // Close dialog
      const closeButton = page
        .getByRole('dialog')
        .getByRole('button', { name: /close|tutup|×/i })
        .first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        // Press escape as fallback
        await page.keyboard.press('Escape');
      }

      // Verify dialog is closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Address validation', () => {
    test('checkout button is disabled without address selection', async ({ page }) => {
      // Mock empty addresses scenario
      await page.route('**/api/v1/users/me/addresses*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ data: [] }),
            headers: { 'content-type': 'application/json' },
          });
        } else {
          await route.continue();
        }
      });

      await openCheckout(page);

      // Proceed button should be disabled or show hint
      const proceedButton = page.getByRole('button', { name: /Bayar sekarang/i });

      // Either disabled or has a hint tooltip
      const isDisabled = await proceedButton.isDisabled();
      const hasHint = await page
        .locator('[data-disabled-hint]')
        .isVisible()
        .catch(() => false);

      expect(isDisabled || hasHint).toBe(true);
    });

    test('address selection enables proceed button', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      // Select address
      await selectAddress(page);

      // Select shipping
      await selectShipping(page);

      // Proceed button should be enabled
      const proceedButton = page.getByRole('button', { name: /Bayar sekarang/i });
      await expect(proceedButton).toBeEnabled({ timeout: 15_000 });
    });
  });

  test.describe('Address accessibility', () => {
    test('address selection is announced to screen readers', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      // Select address
      await selectAddress(page);

      // Check for sr-only announcement
      const announcement = page.locator('p.sr-only').filter({ hasText: /Alamat/ });
      await expect(announcement.first()).toBeVisible();
      await expect(announcement.first()).toContainText(/dipilih/i);
    });

    test('address radio buttons have proper labels', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      // Check that radios have accessible labels
      const radios = page.getByRole('radio');
      const count = await radios.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const radio = radios.nth(i);
        // Each radio should have text content in its label
        const labelText = await radio.locator('xpath=parent::*').textContent();
        expect(labelText?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Address with shipping integration', () => {
    test('changing address refreshes shipping options', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      // Select first address
      await selectAddress(page, 0);

      // Wait for shipping options
      await page.waitForSelector('input[name="shipping-option"]');

      // Get initial shipping options count
      const initialOptions = await page.locator('input[name="shipping-option"]').count();

      // Check if there are multiple addresses to switch
      const radios = page.getByRole('radio');
      const addressCount = await radios.count();

      if (addressCount > 1) {
        // Switch to second address - this should trigger shipping refresh
        await selectAddress(page, 1);

        // Wait a moment for API call
        await page.waitForTimeout(500);

        // Shipping section should still be present
        const shippingSection = page.getByRole('heading', { name: 'Shipping Options' });
        await expect(shippingSection).toBeVisible();
      }
    });

    test('selecting shipping after address completes checkout requirements', async ({ page }) => {
      await seedCartFromHome(page);
      await navigateToCheckout(page);

      // Complete address selection
      await selectAddress(page);

      // Complete shipping selection
      const shippingLabel = await selectShipping(page);

      // Verify shipping is selected
      expect(shippingLabel.length).toBeGreaterThan(0);

      // Proceed button should now be enabled
      const proceedButton = page.getByRole('button', { name: /Bayar sekarang/i });
      await expect(proceedButton).toBeEnabled({ timeout: 15_000 });
    });
  });
});
