import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('http://localhost:3002'); // replace with your local dev URL
  await expect(page).toHaveTitle(/Spliit · Share Expenses with Friends & Family/); // replace with your app's title
});
