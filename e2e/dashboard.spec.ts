import { test, expect } from '@playwright/test';

test('dashboard controls, navigation, API tests and diagnostics work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.log-row')).toHaveCount(1);
  await expect(page.locator('.log-row')).toHaveCount(2, { timeout: 6000 });
  await expect(page.getByText('No trade feed connected')).toBeVisible();
  for (const name of ['BOT STATUS', 'LAST TRADE TIME', 'P/L TODAY']) {
    await page.getByRole('button', { name: new RegExp(name.replace('/', '\\/'), 'i') }).click();
    await expect(page.getByRole('status')).toContainText(/unknown|unavailable/i);
  }
  await page.getByRole('button', { name: 'Refresh data' }).click();
  await expect(page.getByRole('status')).toContainText('Refresh');
  await page.getByRole('button', { name: 'Refresh recent trades' }).click();
  await expect(page.getByRole('status')).toContainText('Refresh');
  await page.getByRole('button', { name: 'Test status API' }).click();
  await expect(page.locator('.api-response pre')).toContainText('"mt5_connected": false');
  await page.getByRole('button', { name: /Close/ }).click();
  await expect(page.locator('.api-response')).toHaveCount(0);
  await page.getByRole('button', { name: 'Test brain API' }).click();
  await expect(page.locator('.api-response pre')).toContainText('system_name');
  await page.getByRole('button', { name: 'Pause automatic refresh' }).click();
  await expect(page.getByRole('status')).toContainText('paused');
  await page.getByRole('button', { name: 'Clear session diagnostics' }).click();
  await expect(page.locator('.console-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Resume automatic refresh' }).click();
  await expect(page.locator('.log-row')).toHaveCount(1, { timeout: 6000 });
  for (const [link, hash] of [['Overview', '#overview'], ['Live trades', '#live-trades'], ['Activity logs', '#activity-logs'], ['API checks', '#api-checks']]) {
    await page.getByRole('link', { name: link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(hash + '$'));
  }
  await page.getByRole('link', { name: /My playbook/ }).click();
  await expect(page).toHaveURL(/\/playbook$/);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(errors).toEqual([]);
});

test('mobile navigation and API buttons work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  for (const [link, hash] of [['Overview', '#overview'], ['Trades', '#live-trades'], ['Logs', '#activity-logs'], ['API', '#api-checks']]) {
    await page.getByRole('link', { name: link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(hash + '$'));
  }
  await page.getByRole('button', { name: 'Test status API' }).click();
  await expect(page.locator('.api-response pre')).toContainText('"mt5_connected": false');
  await page.getByRole('link', { name: /Playbook/ }).first().click();
  await expect(page).toHaveURL(/\/playbook$/);
  await page.getByRole('link', { name: 'Back to dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('status failures do not pretend the bot is connected', async ({ page }) => {
  await page.route('**/api/status', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/dashboard');
  await expect(page.locator('.poll-error')).toContainText('status');
  await expect(page.getByRole('button', { name: /BOT STATUS/ })).toContainText('UNKNOWN');
  await page.getByRole('button', { name: 'Test status API' }).click();
  await expect(page.locator('.api-response pre')).toContainText('HTTP 503');
});

test('monitoring endpoints return uncached JSON without invented trading data', async ({ request }) => {
  const status = await request.get('/api/status');
  expect(status.status()).toBe(200);
  expect(status.headers()['cache-control']).toContain('no-store');
  expect(await status.json()).toMatchObject({ mt5_connected: false, scanning: false, bot_status: 'unknown', last_trade_time: null, pnl_today: null });
  const trades = await request.get('/api/trades');
  expect(await trades.json()).toMatchObject({ available: false, trades: [] });
  const first = await (await request.get('/api/logs')).json();
  const second = await (await request.get('/api/logs')).json();
  expect(first.event.id).not.toBe(second.event.id);
  expect(first.event.message).toContain('Diagnostics API responded');
  const brain = await request.get('/api/brain');
  expect(await brain.json()).toMatchObject({ mt5_connected: false, scanning: false });
});
