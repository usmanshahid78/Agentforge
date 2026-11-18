import { expect, test } from '@playwright/test';

/**
 * Walks the Nova Mart demo: Home -> Build -> Connect -> Test -> Hire.
 * Simulated network failures and the tour are switched off for determinism.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    localStorage.clear();
    localStorage.setItem('agentforge-ui', JSON.stringify({ state: { simulateFailures: false, tourDismissed: true, motion: 'reduce' }, version: 1 }));
    sessionStorage.setItem('e2e-init', '1');
  });
});

test('home to hired agent', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  // Mission control
  await page.goto('/mission');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Describe the job.');
  await page.getByRole('button', { name: 'Analyse how weather affects my shop sales' }).click();

  // Build: scripted interview via quick replies
  await expect(page).toHaveURL(/\/build/);
  const chip = (name: string) => page.getByRole('button', { name, exact: true }).click();
  const next = () => page.getByRole('button', { name: /^Continue/ }).click();
  await chip('Groceries');
  await next();
  await chip('Staffing');
  await chip('Ordering stock');
  await next();
  await chip('Daily');
  await chip('Point of Sale');
  await chip('Weather feed');
  await chip('Local events');
  await next();
  await chip('Recommend only, I decide everything');
  await chip('Forecast accuracy');
  await next();
  await chip('Atlas');
  await expect(page.getByRole('heading', { name: /Atlas, Environment Analyst/ })).toBeVisible();

  // Connect: weather and events through the guided dialog
  await page.getByRole('link', { name: 'Open all data sources' }).click();
  await expect(page).toHaveURL(/\/connect/);
  for (const name of ['Weather feed', 'Local events']) {
    await page.getByRole('button', { name: `Connect ${name}` }).click();
    await page.getByRole('button', { name: 'Use demo key' }).click();
    await page.getByRole('button', { name: 'Verify and connect' }).click();
    await expect(page.getByText('Connected', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
  }

  // Back to the builder: build, then test
  await page.goto('/build');
  await page.getByRole('button', { name: /^Build Atlas/ }).click();
  await page.getByRole('button', { name: /Run backtest/ }).click();

  // Test lab
  await expect(page).toHaveURL(/\/test/);
  await expect(page.getByRole('heading', { name: 'Backtest before you trust' })).toBeVisible();
  await expect(page.getByText('Forecast accuracy', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Useful' }).first().click();
  await page.getByRole('button', { name: 'Promote to shadow mode' }).click();

  // Hire
  await expect(page).toHaveURL(/\/build/);
  await page.getByRole('button', { name: /^Hire Atlas/ }).click();
  await expect(page.getByText('is on the team.')).toBeVisible();

  // Atlas appears in the org chart
  await page.goto('/company');
  await expect(page.locator('.react-flow__node-agent').filter({ hasText: 'Atlas' })).toBeVisible();

  expect(errors).toEqual([]);
});
