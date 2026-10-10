import { test, expect } from '@playwright/test';

test.describe('Role Audit & Navigation Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
  });

  test('USER role sidebar links and forbidden route redirects', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('403')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    // Check visible sidebar links
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    await expect(sidebar.getByText('Live Map')).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Weather')).toBeVisible();
    await expect(sidebar.getByText('Route Planner')).toBeVisible();
    await expect(sidebar.getByText('Driver Mode')).toBeVisible();
    await expect(sidebar.getByText('My Deliveries')).toBeVisible();
    await expect(sidebar.getByText('Field Report')).toBeVisible();
    await expect(sidebar.getByText('Settings')).toBeVisible();

    // Assert forbidden links are NOT in sidebar
    await expect(sidebar.getByText('Vehicles')).not.toBeVisible();
    await expect(sidebar.getByText('Road Status')).not.toBeVisible();
    await expect(sidebar.getByText('Incidents Log')).not.toBeVisible();
    await expect(sidebar.getByText('Verification Queue')).not.toBeVisible();
    await expect(sidebar.getByText('User Management')).not.toBeVisible();
    await expect(sidebar.getByText('Network Data')).not.toBeVisible();

    // Test forbidden route redirects
    await page.goto('/admin/users');
    await page.waitForURL(/.*dashboard/);
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/vehicles');
    await page.waitForURL(/.*dashboard/);
    await expect(page).toHaveURL(/.*dashboard/);

    expect(consoleErrors).toHaveLength(0);
  });

  test('MODERATOR role sidebar links and forbidden route redirects', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('403')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'moderator@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    await expect(sidebar.getByText('Live Map')).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Road Status')).toBeVisible();
    await expect(sidebar.getByText('Incidents Log')).toBeVisible();
    await expect(sidebar.getByText('Shipments')).toBeVisible();
    await expect(sidebar.getByText('Vehicles')).toBeVisible();
    await expect(sidebar.getByText('Verification Queue')).toBeVisible();

    // Assert forbidden links are NOT in sidebar
    await expect(sidebar.getByText('Driver Mode')).not.toBeVisible();
    await expect(sidebar.getByText('User Management')).not.toBeVisible();
    await expect(sidebar.getByText('Network Data')).not.toBeVisible();

    // Test forbidden route redirects
    await page.goto('/admin/users');
    await page.waitForURL(/.*dashboard/);
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/driver');
    await page.waitForURL(/.*dashboard/);
    await expect(page).toHaveURL(/.*dashboard/);

    expect(consoleErrors).toHaveLength(0);
  });

  test('ADMIN role sidebar links and forbidden route redirects', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('403')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    await expect(sidebar.getByText('User Management')).toBeVisible();
    await expect(sidebar.getByText('Network Data')).toBeVisible();
    await expect(sidebar.getByText('Rule Config')).toBeVisible();
    await expect(sidebar.getByText('API Keys')).toBeVisible();
    await expect(sidebar.getByText('Audit Log')).toBeVisible();
    await expect(sidebar.getByText('Demo Tools')).toBeVisible();

    // Assert driver mode is not shown to admin
    await expect(sidebar.getByText('Driver Mode')).not.toBeVisible();

    // Test forbidden route redirects
    await page.goto('/driver');
    await page.waitForURL(/.*dashboard/);
    await expect(page).toHaveURL(/.*dashboard/);

    expect(consoleErrors).toHaveLength(0);
  });
});

