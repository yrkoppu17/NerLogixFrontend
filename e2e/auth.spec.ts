import { test, expect } from '@playwright/test';

test.describe('Designer Login & Authentication', () => {
  const accounts = [
    { email: 'admin@nerlogix.com', pass: 'Demo@1234', role: 'ADMIN', homeUrl: /.*dashboard/ },
    { email: 'moderator@nerlogix.com', pass: 'Demo@1234', role: 'MODERATOR', homeUrl: /.*dashboard/ },
    { email: 'user@nerlogix.com', pass: 'Demo@1234', role: 'USER', homeUrl: /.*(map|driver)/ },
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
  });

  for (const acc of accounts) {
    test(`sign in as ${acc.role} (${acc.email})`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('403')) {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/login');
      await page.fill('input[type="email"]', acc.email);
      await page.fill('input[type="password"]', acc.pass);
      await page.click('button[type="submit"]');

      await page.waitForURL(acc.homeUrl);
      await expect(page).toHaveURL(acc.homeUrl);
      expect(consoleErrors).toHaveLength(0);
    });
  }

  test('signed-in user opening / or /login redirects straight to role home', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nerlogix.com');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);

    // Visiting / redirects to /dashboard for admin
    await page.goto('/');
    await expect(page).toHaveURL(/.*dashboard/);

    // Visiting /login redirects to /dashboard for admin
    await page.goto('/login');
    await expect(page).toHaveURL(/.*dashboard/);
  });
});

