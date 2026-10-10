import { test, expect } from '@playwright/test';

test.describe('Shipment & Vehicle Workflow', () => {
  test('login as moderator, view vehicles & shipments', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'moderator@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to vehicles
    await page.goto('/vehicles');
    await expect(page.locator('h1')).toContainText('Vehicle Fleet');
    await expect(page.locator('table')).toBeVisible();

    // Navigate to shipments
    await page.goto('/shipments');
    await expect(page.locator('h1')).toContainText('Essential Goods Shipments');
  });
});
