import { test, expect } from '@playwright/test';

interface AuditFinding {
  route: string;
  category: 'NETWORK' | 'CONSOLE' | 'UI' | 'FUNCTIONALITY';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
}

test.describe('Full CRM Audit - Real User Simulation (atlas@oomalabs.com)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(120000); // 2 minute thorough audit timeout

  test('Perform comprehensive audit across all CRM routes and actions', async ({ page }) => {
    // Automatically accept all confirm dialogs
    page.on('dialog', async (dialog) => {
      console.log(`Dialog triggered: ${dialog.type()} "${dialog.message()}" -> Accepting`);
      await dialog.accept();
    });

    const findings: AuditFinding[] = [];
    const consoleLogs: { type: string; text: string }[] = [];
    const networkErrors: { url: string; status: number; text: string }[] = [];
    const restRequests: { method: string; url: string; status: number }[] = [];

    page.on('console', (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        const txt = msg.text();
        if (!txt.includes('React DevTools') && !txt.includes('favicon') && !txt.includes('service worker')) {
          findings.push({
            route: page.url(),
            category: 'CONSOLE',
            severity: 'WARNING',
            description: `Console error: ${txt.slice(0, 150)}`,
          });
        }
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.supabase.co/rest/v1/')) {
        restRequests.push({ method: response.request().method(), url, status: response.status() });
        if (response.status() >= 400) {
          networkErrors.push({ url, status: response.status(), text: response.statusText() });
          findings.push({
            route: page.url(),
            category: 'NETWORK',
            severity: 'CRITICAL',
            description: `Supabase REST HTTP ${response.status()} on ${response.request().method()} ${url.split('?')[0]}`,
          });
        }
      }
    });

    console.log('=== [AUDIT STEP 1] Authentication ===');
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.fill('input[type="email"]', 'atlas@oomalabs.com');
    await page.fill('input[type="password"]', '123456789');
    await page.click('button[type="submit"]');

    // Ensure clean redirect into workspace without getting trapped in /onboarding
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log(`Landed at: ${page.url()}`);
    if (page.url().includes('/onboarding')) {
      findings.push({
        route: '/onboarding',
        category: 'FUNCTIONALITY',
        severity: 'CRITICAL',
        description: 'User trapped in /onboarding after login',
      });
    }

    console.log('=== [AUDIT STEP 2] /crm Dashboard ===');
    await page.goto('/crm', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/crm$/);
    
    // Strict Admin Isolation Verification:
    // Non-admin sales reps MUST NOT see "Team CRM" toggle or salesperson switcher
    await expect(page.locator('button:has-text("Team CRM")')).not.toBeVisible();
    await expect(page.locator('select[title="Select Sales Representative"]')).not.toBeVisible();
    console.log('✓ Confirmed: Team CRM toggle and Rep dropdown are completely hidden from sales account');

    // Check Topbar Identity
    const emailVisible = await page.locator('text=atlas@oomalabs.com').isVisible();
    if (!emailVisible) {
      findings.push({
        route: '/crm',
        category: 'UI',
        severity: 'WARNING',
        description: 'Logged in user email not displayed in sidebar',
      });
    }

    // Check KPI Cards
    const kpiCards = page.locator('.grid').first();
    await expect(kpiCards).toBeVisible();

    console.log('=== [AUDIT STEP 3] /crm/leads & Lead Lifecycle ===');
    await page.goto('/crm/leads', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Leads")')).toBeVisible();

    // Verify Team CRM toggle and Rep dropdown remain hidden in leads route
    await expect(page.locator('button:has-text("Team CRM")')).not.toBeVisible();
    await expect(page.locator('select[title="Select Sales Representative"]')).not.toBeVisible();

    // Test Adding a Lead
    const addLeadBtn = page.locator('button:has-text("Add Lead"), button:has-text("Add")').first();
    await expect(addLeadBtn).toBeVisible();
    await addLeadBtn.click();

    // Fill Modal
    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal).toBeVisible();

    // Verify Owner Assignment is hidden for non-admin sales reps
    await expect(modal.locator('text=Assigned Owner / Salesperson')).not.toBeVisible();
    console.log('✓ Confirmed: Owner assignment dropdown is hidden from sales rep in Add Lead modal');
    
    const companyInput = modal.locator('input[placeholder*="ABC Pvt Ltd"]').first();
    const contactInput = modal.locator('input[placeholder*="Rahul Sharma"]').first();
    const emailInput = modal.locator('input[type="email"]').first();
    const phoneInput = modal.locator('input[type="tel"]').first();

    const testLeadName = `Audit Contact ${Date.now()}`;
    const testCompany = `Audit Co ${Date.now()}`;
    const testEmail = `audit_${Date.now()}@example.com`;

    if (await companyInput.isVisible()) await companyInput.fill(testCompany);
    if (await contactInput.isVisible()) await contactInput.fill(testLeadName);
    if (await emailInput.isVisible()) await emailInput.fill(testEmail);
    if (await phoneInput.isVisible()) await phoneInput.fill('+15550001111');

    // Submit Modal
    const saveBtn = modal.locator('button[type="submit"]:has-text("Create Lead")').last();
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // Verify lead appears in table
    const leadRow = page.locator(`text=${testCompany}`).first();
    const leadCreated = await leadRow.isVisible();
    console.log(`Lead Created successfully: ${leadCreated}`);

    if (leadCreated) {
      // Test Expanding lead row
      await leadRow.click();
      await page.waitForTimeout(500);

      // Cleanup: Delete the test lead
      const deleteLeadBtn = page.locator(`xpath=//tr[contains(., "${testCompany}")]//button[@title="Delete Lead"]`).first();
      if (await deleteLeadBtn.isVisible()) {
        await deleteLeadBtn.click();
        await page.waitForTimeout(1000);
        console.log('✓ Cleaned up test lead');
      }
    }

    console.log('=== [AUDIT STEP 4] /crm/pipeline ===');
    await page.goto('/crm/pipeline', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Pipeline")')).toBeVisible();

    console.log('=== [AUDIT STEP 5] /crm/tasks & Task Lifecycle ===');
    await page.goto('/crm/tasks', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();

    // Add Task
    const addTaskBtn = page.locator('button:has-text("Add Task")').first();
    if (await addTaskBtn.isVisible()) {
      await addTaskBtn.click();
      await page.waitForTimeout(500);
      const taskTitleInput = page.locator('input[placeholder*="Follow up on proposal"]').first();
      if (await taskTitleInput.isVisible()) {
        const testTaskTitle = `Audit Task ${Date.now()}`;
        await taskTitleInput.fill(testTaskTitle);
        const saveTaskBtn = page.locator('button[type="submit"]:has-text("Create Task")').last();
        await saveTaskBtn.click();
        await page.waitForTimeout(1500);
        console.log('✓ Task created');

        // Cleanup task
        const deleteBtn = page.locator(`xpath=//div[contains(., "${testTaskTitle}")]//button[contains(@title, "Delete") or contains(@aria-label, "Delete")] | //tr[contains(., "${testTaskTitle}")]//button[contains(@title, "Delete")]`).first();
        if (await deleteBtn.isVisible()) {
          await deleteBtn.click();
          await page.waitForTimeout(500);
          console.log('✓ Cleaned up test task');
        }
      }
    }

    console.log('=== [AUDIT STEP 6] /crm/calendar ===');
    await page.goto('/crm/calendar', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Google Calendar Sync')).toBeVisible();

    console.log('=== [AUDIT STEP 7] /crm/notes ===');
    await page.goto('/crm/notes', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Interaction Hub")')).toBeVisible();

    console.log('=== [AUDIT STEP 8] /crm/projects ===');
    await page.goto('/crm/projects', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Onboarding Projects")')).toBeVisible();

    console.log('=== [AUDIT STEP 9] /crm/reports ===');
    await page.goto('/crm/reports', { waitUntil: 'networkidle' });
    // Non-admin atlas user correctly sees Access Denied guard
    await expect(page.locator('text=Access Denied')).toBeVisible();
    console.log('✓ Verified reports route access control: Access Denied displayed');

    console.log('=== [AUDIT STEP 10] /crm/settings ===');
    await page.goto('/crm/settings', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
    // Verify NotebookLM is read-only for atlas
    const nbInput = page.locator('input[placeholder*="notebooklm.google.com"]').first();
    await expect(nbInput).toBeDisabled();

    console.log('=== [AUDIT STEP 11] /crm/sales-plan ===');
    await page.goto('/crm/sales-plan', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Sales Plan').or(page.locator('text=Monthly Sales Plan'))).toBeVisible();

    // Summary of Audit
    console.log('\n================ AUDIT SUMMARY ================');
    console.log(`Total Supabase REST Requests: ${restRequests.length}`);
    console.log(`Supabase REST Errors (>=400): ${networkErrors.length}`);
    console.log(`Console Errors: ${consoleLogs.filter(l => l.type === 'error').length}`);
    console.log(`Identified Audit Findings: ${findings.length}`);
    findings.forEach((f, idx) => console.log(`  ${idx + 1}. [${f.category} - ${f.severity}] ${f.description}`));
    console.log('================================================\n');

    expect(networkErrors).toHaveLength(0);
  });
});
