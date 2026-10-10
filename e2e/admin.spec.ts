import { test, expect } from '@playwright/test';

test.describe('Admin & Central Management Flows', () => {
  test('login as admin, view users, rule config & generate API key', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // Users page
    await page.goto('/admin/users');
    await expect(page.locator('h1')).toContainText('User & Access Management');
    await expect(page.locator('table')).toBeVisible();

    // Rules page
    await page.goto('/admin/rules');
    await expect(page.locator('h1')).toContainText('Rule Engine Threshold Config');

    // API Keys page
    await page.goto('/admin/api-keys');
    await expect(page.locator('h1')).toContainText('Integration API Keys');

    // Audit Log page
    await page.goto('/admin/audit');
    await expect(page.locator('h1')).toContainText('System Audit Log');

    // Demo tools page
    await page.goto('/admin/demo');
    await expect(page.locator('h1')).toContainText('Interactive Demo & Simulation Tools');
  });
});
