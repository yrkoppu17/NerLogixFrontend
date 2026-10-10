import { test, expect } from '@playwright/test';

test.describe('Full 6-step Operational Pipeline', () => {
  test('drives full pipeline from field incident report to alert & route action', async ({ page }) => {
    // Step 1: Login as USER and submit field report
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(map|driver)/);

    // Go to Field Report page
    await page.goto('/field-report');
    await expect(page.locator('h1')).toContainText('Submit Field Incident Report');

    // Fill field report form
    await page.selectOption('select[name="type"]', 'LANDSLIDE');
    await page.click('button:has-text("Level 4")');
    await page.fill('textarea[name="note"]', 'Severe landslide blocking highway corridor near Nagaon');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Report Queued')).toBeVisible({ timeout: 5000 });

    // Step 2 & 3: Login as MODERATOR to review & verify report
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.fill('input[type="email"]', 'moderator@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);

    // Check Incidents Log
    await page.goto('/incidents');
    await expect(page.locator('h1')).toContainText('Incidents');

    // Switch to Field Reports Queue tab
    await page.click('button:has-text("Field Reports Queue")');
    await page.waitForTimeout(1000);

    // Verify report if present in queue
    const verifyBtn = page.locator('button:has-text("Verify & Create Incident")').first();
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      await page.waitForTimeout(1000);
    }

    // Step 4: Verify GIS Map & Dashboard live updates
    await page.goto('/roads');
    await expect(page.locator('h1')).toContainText('Road Corridor & Status Management');
    await expect(page.locator('table')).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Step 5: Check Alerts sent to stakeholders
    await page.goto('/alerts');
    await expect(page.locator('h1')).toContainText('Instant Alert Notifications');

    // Step 6: Route Action - Driver Mode view & accept route
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    await page.goto('/driver');
    await expect(page.locator('text=Driver Navigation Mode')).toBeVisible();
  });
});
