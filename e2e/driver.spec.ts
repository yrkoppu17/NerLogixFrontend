import { test, expect } from '@playwright/test';

test.describe('Driver Mode & Reroute Flow', () => {
  test('login as driver, view driver mode UI & active shipment', async ({ page }) => {
    // Login as user (who is seeded as driver)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*(map|driver)/);

    // Navigate to driver mode
    await page.goto('/driver');
    await expect(page.locator('h1')).toContainText('User');
    await expect(page.locator('text=Driver Navigation Mode')).toBeVisible();
  });
});
