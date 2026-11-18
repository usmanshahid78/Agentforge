import { expect, test, type Page } from '@playwright/test';

/**
 * Back office: stats on the home page, then a new organization from a
 * description, its investment dashboard, team and details.
 * The scripted AI provider is selected so the test never waits on Ollama.
 * Set SHOTS=<dir> to save screenshots of each screen.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    localStorage.clear();
    localStorage.setItem('agentforge-ui', JSON.stringify({ state: { simulateFailures: false, tourDismissed: true, motion: 'reduce' }, version: 1 }));
    localStorage.setItem('agentforge-ai', JSON.stringify({ state: { provider: 'mock', model: 'qwen3:4b-instruct' }, version: 2 }));
    sessionStorage.setItem('e2e-init', '1');
  });
});

const shot = async (page: Page, name: string) => {
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}.png`, fullPage: true });
};

test('back office to a new organization dashboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What people are building');
  await expect(page.getByRole('link', { name: 'Thor Portfolio Management' })).toBeVisible();
  await expect(page.getByText('AI agents at work')).toBeVisible();
  await shot(page, '1-backoffice');

  // Describe a new organization; the preview updates while typing.
  await page.getByRole('link', { name: 'New organization' }).first().click();
  await expect(page).toHaveURL(/\/orgs\/new/);
  await page.getByLabel('Your name').fill('Test Creator');
  await page.getByRole('button', { name: 'Portfolio management' }).click();
  const preview = page.getByRole('complementary', { name: 'What was understood' });
  await expect(preview.getByText('Investment Manager', { exact: true })).toBeVisible();
  await expect(preview.getByText('Auditor', { exact: true })).toBeVisible();
  await shot(page, '2-new-org');
  await page.getByRole('button', { name: 'Create organization' }).click();

  // Dashboard: portfolios, period returns, contributions, recommendations, AI suggestions.
  await expect(page).toHaveURL(/\/orgs\/org-/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thor Portfolio Management');
  await expect(page.getByText('Assets under management')).toBeVisible();
  await expect(page.getByText('ITD · Inception to date')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contribution by stock' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recommendations by agent' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI suggestions' })).toBeVisible();
  await page.getByRole('button', { name: /^Income & Dividend/ }).click();
  await expect(page.getByRole('heading', { name: 'Income & Dividend', level: 2 })).toBeVisible();
  await shot(page, '3-dashboard');

  await page.getByRole('tab', { name: /Organization/ }).click();
  await expect(page.getByText('Reports to Thor').first()).toBeVisible();
  await shot(page, '4-organization');

  await page.getByRole('tab', { name: /Details/ }).click();
  await expect(page.getByText('Exactly as Test Creator wrote it.')).toBeVisible();
  await shot(page, '5-details');

  // Back on the back office, the new organization is counted.
  await page.getByRole('link', { name: 'Back office' }).first().click();
  await expect(page.getByRole('link', { name: 'Thor Portfolio Management' })).toHaveCount(2);

  // A retail organization gets the activity dashboard instead.
  await page.getByRole('link', { name: 'Lena Grocery Retail' }).click();
  await expect(page.getByRole('heading', { name: 'Tasks done per week' })).toBeVisible();
  await shot(page, '6-ops');

  expect(errors).toEqual([]);
});
