import { test, expect } from '@playwright/test';

test.describe('Route Planner E2E (Google-Maps-Only)', () => {
  test('User can calculate alternate safe routes from Guwahati to Imphal on Google Maps only', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    // 2. Navigate to Route Planner page
    await page.goto('/planner');
    await expect(page.locator('h1')).toContainText('Alternate Routes & Delay Estimator');

    // Assert NO Leaflet container exists on the page
    await expect(page.locator('.leaflet-container')).toHaveCount(0);

    // 3. Select origin & destination
    const selects = page.locator('select');
    await expect(selects.first()).toBeVisible();

    // Select Guwahati as origin and Imphal as destination
    const guwahatiOption = selects.first().locator('option:has-text("Guwahati")').first();
    const guwahatiVal = await guwahatiOption.getAttribute('value');
    await selects.first().selectOption(guwahatiVal!);

    const imphalOption = selects.nth(1).locator('option:has-text("Imphal")').first();
    const imphalVal = await imphalOption.getAttribute('value');
    await selects.nth(1).selectOption(imphalVal!);

    // 4. Click calculate safe routes
    await page.click('button:has-text("Calculate Safe Routes")');

    // 5. Verify results render
    await expect(page.locator('h2')).toContainText('Available Route Options');
    await expect(page.locator('text=Segment Breakdown')).toBeVisible();

    // Assert Google Maps map container or Google iframe is present
    const googleIframe = page.locator('iframe[src*="google.com/maps"]');
    const googleMapDiv = page.locator('div:has-text("Interactive Google Map")');
    await expect(googleIframe.or(googleMapDiv).first()).toBeVisible();

    // Re-verify NO Leaflet container exists after calculation
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
  });
});
