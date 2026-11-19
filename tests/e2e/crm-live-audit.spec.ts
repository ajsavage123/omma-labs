import { test, expect } from '@playwright/test';

test.describe('CRM Live Audit Verification - atlas@oomalabs.com', () => {
  test.setTimeout(60000); // 1 minute timeout for live network test

  test('Log in with atlas@oomalabs.com and verify all CRM audit fixes', async ({ page }) => {
    // Collect console logs and errors
    const consoleErrors: string[] = [];
    const supabase400Errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.supabase.co/rest/v1/') && response.status() >= 400) {
        supabase400Errors.push(`${response.status()} ${response.statusText()} -> ${url}`);
      }
    });

    // 1. Navigate to /login
    console.log('Navigating to /login...');
    await page.goto('/login', { waitUntil: 'networkidle' });

    // 2. Fill login credentials
    console.log('Logging in with atlas@oomalabs.com...');
    await page.fill('input[type="email"]', 'atlas@oomalabs.com');
    await page.fill('input[type="password"]', '123456789');
    await page.click('button[type="submit"]');

    // 3. Wait for post-login navigation (should NOT be stuck on /onboarding)
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log(`Landed on URL: ${page.url()}`);
    expect(page.url()).not.toContain('/onboarding');

    // 4. Navigate to CRM root /crm
    console.log('Navigating to /crm...');
    await page.goto('/crm', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/crm/);

    // 5. Verify User Profile in CRMLayout header/sidebar
    console.log('Verifying user identity displays actual atlas user...');
    // Should show atlas email or initials (NOT static 'OA' or static 'admin@oomalabs.com')
    const userEmailLocator = page.locator('text=atlas@oomalabs.com');
    await expect(userEmailLocator).toBeVisible({ timeout: 10000 });
    console.log('✓ Found atlas@oomalabs.com in user profile banner/sidebar');

    // 6. Test Topbar Search (F1)
    console.log('Testing topbar search...');
    const searchInput = page.locator('input[placeholder*="Search anything"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Acme Corp');
    await searchInput.press('Enter');
    await page.waitForURL(/\/crm\/leads\?search=Acme\+Corp|\/crm\/leads\?search=Acme%20Corp/, { timeout: 10000 });
    console.log('✓ Topbar search navigated to leads page with search query');

    // 7. Verify Leads Page UI (F13 expanded lead row styling & F9 delete safety)
    console.log('Verifying /crm/leads page components...');
    await expect(page.locator('h1:has-text("Leads")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Add Lead"), button:has-text("Add")').first()).toBeVisible();
    console.log('✓ Leads page loaded and rendered successfully');

    // 8. Test Tasks Page (F4 & F11 task bucketing)
    console.log('Navigating to /crm/tasks...');
    await page.goto('/crm/tasks', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Task Manager').or(page.locator('h1:has-text("Tasks")'))).toBeVisible({ timeout: 10000 });
    // Check that bucket headers or tabs exist without NaN
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('NaN');
    console.log('✓ Tasks page loaded cleanly without date parsing NaN errors');

    // 9. Test Calendar Page (F5 formatting)
    console.log('Navigating to /crm/calendar...');
    await page.goto('/crm/calendar', { waitUntil: 'networkidle' });
    // Look for Google Setup Guide button
    const setupGuideBtn = page.locator('button[title="Google Setup Guide"]').first();
    await expect(setupGuideBtn).toBeVisible({ timeout: 10000 });
    await setupGuideBtn.click();
    await page.waitForTimeout(500);

    const setupContent = await page.textContent('body');
    expect(setupContent).toContain('How to generate a Client ID:');
    expect(setupContent).toContain('Authorized JavaScript Origins');
    // Ensure origin is dynamically resolved (http://localhost:5173), not hardcoded localhost text or raw markdown
    expect(setupContent).toContain('http://localhost:5173');
    expect(setupContent).not.toContain('**1. Go to Google Cloud Console**');
    console.log('✓ Calendar setup guide renders clean HTML with dynamic origin');

    // 10. Test Settings Page (F6 NotebookLM admin-only restriction & F10 Sonner toast)
    console.log('Navigating to /crm/settings...');
    await page.goto('/crm/settings', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });

    // Check NotebookLM Knowledge Base section:
    // Atlas is Partner/Sales rep (not 'admin').
    // Should display 'Admin Managed (Read Only)' badge, inputs disabled, and no save button!
    console.log('Verifying NotebookLM permissions for atlas@oomalabs.com...');
    const notebookInputs = page.locator('input[placeholder*="notebooklm.google.com"]');
    await expect(notebookInputs.first()).toBeVisible();
    await expect(notebookInputs.first()).toBeDisabled();
    await expect(notebookInputs.nth(1)).toBeVisible();
    await expect(notebookInputs.nth(1)).toBeDisabled();
    
    // Save buttons should NOT be visible
    const saveNotebookBtn = page.locator('button:has-text("Save Notebook Link"), button:has-text("Save Dev Support Link")');
    await expect(saveNotebookBtn).toHaveCount(0);

    // Read only badge should be visible
    const readOnlyBadge = page.locator('text=Admin Managed (Read Only)').first();
    await expect(readOnlyBadge).toBeVisible();
    console.log('✓ Both NotebookLM inputs are strictly Read-Only and disabled for non-admin atlas user!');

    // Test Toast feedback with "Test Local Push"
    console.log('Testing Sonner toast with Test Local Push...');
    const testPushBtn = page.locator('button:has-text("Test Local Push")');
    await expect(testPushBtn).toBeVisible();
    await testPushBtn.click();

    // Verify toast is visible
    const toastLocator = page.locator('[data-sonner-toast]').filter({ hasText: 'Local test notification' });
    await expect(toastLocator).toBeVisible({ timeout: 5000 });
    console.log('✓ Sonner toast confirmed working on Test Local Push click!');

    // 11. Test Support Chat Widget Minimize (F8)
    console.log('Testing Support Chat Widget minimize button...');
    const minimizeBtn = page.locator('button[title="Minimize support chat"], button[aria-label="Minimize support chat"]').first();
    if (await minimizeBtn.isVisible()) {
      await minimizeBtn.click();
      // Should show collapsed badge
      await expect(page.locator('text=Support Bot (Online)').or(page.locator('text=Support Bot'))).toBeVisible();
      console.log('✓ Support widget minimized smoothly without covering CRM UI');
    }

    // 12. Test Sales Plan Toast (F12)
    console.log('Navigating to /crm/sales-plan...');
    await page.goto('/crm/sales-plan', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Monthly Sales Plan').or(page.locator('text=Sales Plan'))).toBeVisible({ timeout: 10000 });

    // Find first checkbox in daily tasks / goals
    const goalCheckbox = page.locator('button[role="checkbox"], input[type="checkbox"]').first();
    if (await goalCheckbox.isVisible()) {
      await goalCheckbox.click();
      // Verify toast appeared
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 });
      console.log('✓ Sales plan goal check showed confirmation toast');
      // Click again to toggle back
      await goalCheckbox.click();
      await page.waitForTimeout(500);
      console.log('✓ Goal toggled back to original state');
    }

    // 13. Verify Zero 400 Bad Requests to Supabase REST
    console.log('Verifying Supabase REST network health...');
    if (supabase400Errors.length > 0) {
      console.error('Supabase 400 Errors found:', supabase400Errors);
    }
    expect(supabase400Errors).toHaveLength(0);
    console.log('✓ Zero 400 Bad Requests made to Supabase REST endpoints!');
  });
});
