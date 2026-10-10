import { test, expect } from '@playwright/test';

test('health check API returns UP', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('UP');
  expect(body.database).toBe('UP');
});
