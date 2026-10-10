import { test, expect } from '@playwright/test';

test.describe('Field Reporting & Incident History', () => {
  test('submit field report and view incidents log', async ({ page }) => {
    // Login as moderator
    await page.goto('/login');
    await page.fill('input[type="email"]', 'moderator@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard/);

    // Go to Field Report
    await page.goto('/field-report');
    await expect(page.locator('h1')).toContainText('Submit Field Incident Report');

    // Fill report
    await page.fill('textarea', 'Debris blocking two lanes near Shillong corridor');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Report Queued Successfully!')).toBeVisible();

    // Go to Incidents
    await page.goto('/incidents');
    await expect(page.locator('h1')).toContainText('Incidents & Incident History Logs');
  });
});

