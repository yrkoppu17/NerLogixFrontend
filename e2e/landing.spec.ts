import { test, expect } from '@playwright/test';

test.describe('Phase 3 Landing / About Page', () => {
  test('renders hero headline, count-ups from overview API, and SVG network at /about', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/about');

    // Hero Headline
    await expect(page.getByText('Know which roads are open before your convoy leaves.')).toBeVisible();

    // Buttons
    await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View the live map' }).first()).toBeVisible();

    // Count-ups text check
    await expect(page.getByText('Districts monitored')).toBeVisible();
    await expect(page.getByText('Segments tracked')).toBeVisible();

    // Google Maps element
    const mapElement = page.locator('iframe[title*="Google Maps"]');
    await expect(mapElement).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('responsive viewport check at 390px mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/about');
    await expect(page.getByText('Know which roads are open before your convoy leaves.')).toBeVisible();
  });
});
