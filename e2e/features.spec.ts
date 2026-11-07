import { test, expect } from '@playwright/test';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aGQAAAAASUVORK5CYII=', 'base64');
const assessment = { pattern: 'Break and retracement', bias: 'Bullish', entry: 2100, sl: 2095, tp: 2110, rr: 2, confidence: 75, verdict: 'TAKE', notes: 'Illustrative mocked response. Review manually.' };

test('upload multiple charts, inspect results and manage browser history', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/brain/analyze', async route => {
    requests++;
    expect(route.request().headers()['authorization']).toBe('Bearer example-access-token-1234567890');
    await route.fulfill({ json: assessment });
  });
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Upload Setup', exact: true }).click();
  await expect(page).toHaveURL(/\/brain$/);
  await page.locator('#chart-files').setInputFiles([
    { name: 'm5.png', mimeType: 'image/png', buffer: png },
    { name: 'm1.png', mimeType: 'image/png', buffer: png },
  ]);
  await page.getByLabel('ASSESSMENT ACCESS TOKEN').fill('example-access-token-1234567890');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Analyze setup' }).click();
  await expect(page.getByRole('status')).toContainText('2 of 2 images assessed');
  expect(requests).toBe(2);
  await expect(page.locator('.result-card')).toContainText('Bullish');
  await expect(page.locator('.result-card')).toContainText('75%');
  await expect(page.locator('.history-item')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.history-item')).toHaveCount(2);
  await expect(page.getByLabel('ASSESSMENT ACCESS TOKEN')).toHaveValue('');
  await page.getByRole('button', { name: /m5.png/ }).first().click();
  await expect(page.locator('.result-image')).toContainText('m5.png');
  await page.getByRole('button', { name: 'Delete m5.png' }).click();
  await expect(page.locator('.history-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear history' }).click();
  await expect(page.getByText('No saved assessments yet.')).toBeVisible();
});

test('upload validates files and communicates errors', async ({ page }) => {
  await page.goto('/brain');
  await page.getByRole('button', { name: 'Analyze setup' }).click();
  await expect(page.getByRole('status')).toContainText('Choose an image');
  await page.locator('#chart-files').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('no') });
  await expect(page.getByRole('status')).toContainText('skipped');
  await page.route('**/api/brain/analyze', route => route.fulfill({ status: 503, json: { error: 'Analysis is not configured.' } }));
  await page.locator('#chart-files').setInputFiles({ name: 'chart.png', mimeType: 'image/png', buffer: png });
  await page.getByLabel('ASSESSMENT ACCESS TOKEN').fill('example-access-token-1234567890');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Analyze setup' }).click();
  await expect(page.getByRole('status')).toContainText('Analysis is not configured');
});

test('EA downloads, install guide and HOLD-only signal endpoint', async ({ page, request }) => {
  await page.goto('/ea');
  const sourceDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download EA (.mq5)' }).click();
  expect((await sourceDownload).suggestedFilename()).toBe('TradingBrain.mq5');
  const readmeDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Instructions' }).click();
  expect((await readmeDownload).suggestedFilename()).toBe('README.txt');
  const source = await (await request.get('/ea/TradingBrain.mq5')).text();
  expect(source).toContain('input bool EnableTrading = false');
  expect(source).toContain('input bool DemoOnly = true');
  expect(source).toContain('WebRequest(');
  expect(await (await request.get('/api/signal')).json()).toMatchObject({ action: 'HOLD', confidence: null });
  await page.getByRole('link', { name: /OPEN THE FULL INSTALL GUIDE/ }).click();
  await expect(page).toHaveURL(/\/ea\/guide$/);
  await expect(page.getByText('Allow the secure API URL')).toBeVisible();
  await page.getByRole('link', { name: /BACK TO EA CENTER/ }).click();
  await expect(page).toHaveURL(/\/ea$/);
});

test('analysis endpoint is unavailable or unauthorized without a token', async ({ request }) => {
  const response = await request.post('/api/brain/analyze', { multipart: { image: { name: 'x.png', mimeType: 'image/png', buffer: png } } });
  expect([401, 503]).toContain(response.status());
  expect(await response.json()).toHaveProperty('error');
});
