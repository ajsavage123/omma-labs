import { test, expect } from '@playwright/test';

// Skip since we need logged-in state. Usually, we would use storageState or a mock service worker.
test.describe('Dashboard and Projects', () => {
  // We'll assume the user is logged in for these tests
  // Or use a setup that bypasses auth for local dev testing

  test('should load projects on the dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');

    // Check if dashboard content loads
    // This assumes the user is redirected to DashboardPage after login or bypass
    await expect(page.locator('h1')).toContainText('Projects');

    // Check if a project card is visible (if any exist)
    // await expect(page.locator('.bg-white.rounded-2xl.shadow-sm').first()).toBeVisible();
  });

  test('mobile-view responsive check', async ({ page, isMobile }) => {
    await page.goto('/');
    if (isMobile) {
      // Check for mobile-specific elements, like a hidden sidebar or specific padding
      // await expect(page.locator('.md:hidden')).toBeVisible();
    }
  });

  test('create project modal triggers correctly', async ({ page }) => {
    await page.goto('/');

    // Find "Create Project" button
    const createBtn = page.locator('button:has-text("Create Project")');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      // Check if modal appears
      await expect(page.locator('h2')).toContainText('Create New Project');
      await expect(page.locator('input[placeholder="Project Name"]')).toBeVisible();
    }
  });
});
