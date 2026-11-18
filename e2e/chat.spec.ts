import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/ollama/api/tags', (route) => route.fulfill({ json: { models: [{ name: 'qwen3:4b-instruct' }] } }));
});

test('assistant replies render Markdown headings, bold, lists and literal code', async ({ page }) => {
  const reply = '### 8. **Daily Life & Practical Help**\n\n- Help with **recipes** and planning.\n\n---\n\n**Important Note**: Check the details.\n\n```text\n### keep these hashes\n```\n\n<script>window.markdownExecuted = true</script>';
  await page.route('**/ollama/api/chat', (route) => route.fulfill({
    contentType: 'application/x-ndjson',
    body: JSON.stringify({ message: { content: reply }, done: true }) + '\n',
  }));
  await page.goto('/chat');
  await page.getByLabel('Message your local AI').fill('Show me **formatting**');
  await page.getByRole('button', { name: 'Send message' }).click();
  const assistant = page.getByLabel('Assistant reply');
  await expect(assistant.getByRole('heading', { name: '8. Daily Life & Practical Help' })).toBeVisible();
  await expect(assistant.locator('strong', { hasText: 'Important Note' })).toBeVisible();
  await expect(assistant.getByRole('listitem')).toContainText('Help with recipes and planning.');
  await expect(assistant.locator('pre code')).toHaveText('### keep these hashes\n');
  await expect(assistant).not.toContainText('**Important Note**');
  await expect(assistant.locator('script')).toHaveCount(0);
  await expect(page.getByLabel('Your message', { exact: true })).toContainText('Show me **formatting**');
});

test('chat sends history, displays model replies and starts a new conversation', async ({ page }) => {
  const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  await page.route('**/ollama/api/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ contentType: 'application/x-ndjson', body: [
      JSON.stringify({ message: { content: 'Hello from ' }, done: false }),
      JSON.stringify({ message: { content: 'your local model.' }, done: true, eval_count: 6 }),
      '',
    ].join('\n') });
  });
  await page.goto('/chat');
  await expect(page.getByRole('heading', { name: 'AI Chat', exact: true })).toBeVisible();
  await expect(page.getByText('Ollama connected')).toBeVisible();
  await page.getByLabel('Message your local AI').fill('Hello');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Assistant reply')).toContainText('Hello from your local model.');
  await page.getByLabel('Message your local AI').fill('What did I say?');
  await page.getByLabel('Message your local AI').press('Enter');
  await expect(page.getByLabel('Assistant reply')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
  expect(requests[1]?.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
  expect(requests[1]?.messages[1]?.content).toBe('Hello');
  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByRole('heading', { name: 'What’s on your mind?' })).toBeVisible();
  await expect(page.getByLabel('Assistant reply')).toHaveCount(0);
});

test('a failed request shows an error and can be retried without duplicating messages', async ({ page }) => {
  let attempts = 0;
  await page.route('**/ollama/api/chat', async (route) => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 502, body: '' });
    else await route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ message: { content: 'Connection restored.' }, done: true }) + '\n' });
  });
  await page.goto('/chat');
  await page.getByLabel('Message your local AI').fill('Are you there?');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('alert')).toContainText('Ollama is not running');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByLabel('Assistant reply')).toContainText('Connection restored.');
  await expect(page.getByLabel('Your message', { exact: true })).toHaveCount(1);
});
