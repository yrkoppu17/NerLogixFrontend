import { test, expect } from '@playwright/test';

test.describe('Phase 5 Weather & Rule Engine', () => {
  test('Admin can use Demo Rain Tool and see weather condition log updated', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Sign in as ADMIN
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to Weather page using sidebar link
    await page.locator('a[href="/weather"]').click();
    await expect(page.getByText('District Weather & Condition Logs')).toBeVisible();

    // Verify Demo Rain Tool is visible for Admin
    await expect(page.getByText('Admin Demo Rain Tool')).toBeVisible();

    // Select district 2 and EXTREME rain
    const demoSelect = page.locator('select').first();
    await expect(demoSelect.locator('option').nth(2)).toBeAttached({ timeout: 10000 });
    const districtVal = await demoSelect.locator('option').nth(2).getAttribute('value');
    if (districtVal) {
      await demoSelect.selectOption(districtVal);
    }

    const condSelect = page.locator('select').nth(1);
    await condSelect.selectOption('EXTREME');

    const responsePromise = page.waitForResponse((resp) => resp.url().includes('/api/admin/demo/rain') && resp.status() === 200);
    const triggerBtn = page.getByRole('button', { name: 'Trigger Rain Simulation' });
    await expect(triggerBtn).toBeEnabled({ timeout: 5000 });
    await triggerBtn.click();
    await responsePromise;

    // Verify EXTREME weather condition banner is visible
    await expect(page.getByTestId('demo-success')).toBeVisible({ timeout: 15000 });

    expect(consoleErrors).toHaveLength(0);
  });
});
