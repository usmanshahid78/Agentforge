import { expect, test } from '@playwright/test';

/** Portfolio -> use case preview -> Team (create agent) -> Canvas (run, approve fixes). */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    localStorage.clear();
    localStorage.setItem('agentforge-ui', JSON.stringify({ state: { simulateFailures: false, tourDismissed: true, motion: 'reduce' }, version: 1 }));
    sessionStorage.setItem('e2e-init', '1');
  });
});

test('portfolio to resolved inventory problems', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewportSize({ width: 1440, height: 900 });

  // Portfolio: industry boxes and the use-case preview
  await page.goto('/portfolio');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every problem your agents can solve');
  for (const name of ['Retail', 'Stock Trading', 'Auto Industry', 'Banking']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: /^Inventory Reconciliation,/ }).click();
  const panel = page.getByRole('complementary', { name: 'Use case details' });
  await expect(panel.getByText('James', { exact: true })).toBeVisible();
  await expect(panel.getByText('Tolerance threshold')).toBeVisible();

  // Team: org structure and a recommended agent
  await panel.getByRole('link', { name: 'Open team' }).click();
  await expect(page).toHaveURL(/\/projects\/retail-inv-recon\?tab=team/);
  await expect(page.locator('.react-flow__node-teamAgent')).toHaveCount(4);
  await page.getByRole('button', { name: 'Create agent' }).first().click();
  await expect(page.locator('.react-flow__node-teamAgent')).toHaveCount(5);

  // Canvas: run the team, then approve both fixes
  await page.getByRole('tab', { name: /Canvas/ }).click();
  await page.getByRole('button', { name: /^Run Inv\. Recon\. now/ }).click();
  await expect(page.getByText("James's team is working")).toBeVisible();
  await expect(page.getByText('Vendor Liaison', { exact: true }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /^Run Inv\. Recon\. now/ })).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Approve fix' }).first().click();
  await expect(page.getByText("James's team resolved 2 issues. There are no open inventory problems.").first()).toBeVisible();

  // The tile on the portfolio is green now
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Portfolio' }).click();
  await expect(page).toHaveURL(/localhost:\d+\/portfolio$/);
  await expect(page.getByRole('button', { name: /^Inventory Reconciliation, Live/ })).toBeVisible();

  expect(errors).toEqual([]);
});
