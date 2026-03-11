import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('should display login page components', async ({ page }) => {
    await expect(page).toHaveTitle(/Omma Labs/);
    await expect(page.locator('h1')).toContainText(/Pipeline/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Assuming there's some error toast or message
    await expect(page.locator('text=Invalid login credentials')).toBeVisible();
  });

  // Example for a successful login - usually done with test users or mocking
  // test('should log in successfully', async ({ page }) => {
  //   await page.fill('input[type="email"]', 'test@example.com');
  //   await page.fill('input[type="password"]', 'password');
  //   await page.click('button[type="submit"]');
  //   await expect(page).toHaveURL('/');
  // });
});
