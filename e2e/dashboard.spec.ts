import { test, expect } from '@playwright/test';

test.describe('Dashboard & Analytics Specs', () => {
  test('login and view dashboard 8 KPIs, connectivity & supply gap tabs', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'moderator@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Operational Command Dashboard');

    // Check KPI cards
    await expect(page.locator('text=Districts')).toBeVisible();
    await expect(page.locator('text=Degraded')).toBeVisible();

    // Switch to District Connectivity tab
    await page.click('button:has-text("District Connectivity")');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Connectivity Score")')).toBeVisible();

    // Switch to Supply Gaps tab
    await page.click('button:has-text("Essential Supply Gaps")');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Days of Cover")')).toBeVisible();
  });
});
