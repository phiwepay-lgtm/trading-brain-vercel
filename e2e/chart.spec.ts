import { test, expect } from '@playwright/test';
const TOKEN = 'test-token-contains-24-characters';

test('default chart and APIs clearly report missing configuration', async ({ page, request }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page).toHaveURL(/\/chart$/);
  await expect(page.getByLabel('M5 chart')).toContainText('M5 — Heiken Ashi — 21 EMA');
  await expect(page.getByLabel('M1 chart')).toContainText('M1 — Candles — 9 EMA');
  await expect(page.getByRole('status')).toContainText('Market data is not configured');
  await expect(page.getByText('No market data to display')).toHaveCount(2);
  await expect(page.getByText('MT5 OFFLINE')).toBeVisible();
  expect((await request.get('/api/chart/candles?symbol=bad&timeframe=M1')).status()).toBe(400);
  expect((await request.get('/api/chart/candles?symbol=XAUUSD&timeframe=M1')).status()).toBe(503);
  expect((await request.get('/api/chart/price?symbol=XAUUSD')).status()).toBe(503);
  expect((await request.get('/api/chart/stream?symbol=XAUUSD')).status()).toBe(503);
  expect(errors).toEqual([]);
});

test('mocked feed updates both charts, drawing persistence, copy, journal and controls', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const time = Math.floor(Date.now() / 1000 / 60) * 60;
  await page.route('**/api/chart/candles?**', async route => {
    const url = new URL(route.request().url()), tf = url.searchParams.get('timeframe'), seconds = tf === 'M5' ? 300 : 60;
    const end = url.searchParams.has('before') ? Number(url.searchParams.get('before')) - seconds : Math.floor(time / seconds) * seconds;
    const rows = Array.from({length: 500}, (_, i) => ({time: end - (499 - i) * seconds, open: 2500 + i * .001, high: 2502 + i * .001, low: 2498 + i * .001, close: 2501 + i * .001, volume: null}));
    await route.fulfill({ status: 200, json: rows });
  });
  await page.route('**/api/chart/stream?**', async route => {
    const symbol = new URL(route.request().url()).searchParams.get('symbol');
    const tick = {symbol, time, last: 2501.75, bid: 2501.70, ask: 2501.80};
    await route.fulfill({status: 200, contentType: 'text/event-stream', body: `event: status\ndata: {"state":"subscribed"}\n\nevent: tick\ndata: ${JSON.stringify(tick)}\n\n`});
  });
  await page.addInitScript(token => sessionStorage.setItem('chart-access-token', token), TOKEN);
  await page.goto('/chart');
  await expect(page.getByText('2501.75')).toBeVisible();
  await expect(page.getByText('2501.70')).toBeVisible();
  await expect(page.getByText('2501.80')).toBeVisible();
  const p1 = page.getByLabel('M1 chart');
  await p1.locator('.chart-host').hover({position: {x: 300, y: 180}});
  await expect(p1.locator('.pane-sub')).toContainText('O ');
  await expect(page.getByLabel('M5 chart').locator('.pane-sub')).toContainText('O ');
  await p1.getByRole('button', {name: 'M1 Horizontal line'}).click();
  const canvas = p1.locator('.drawing-layer'); await canvas.click({position: {x: 200, y: 180}});
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trading-brain-drawings-v1:XAUUSD:M1') || '[]').length)).toBe(1);
  await p1.getByRole('button', {name: 'Copy M1 drawings to M5'}).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trading-brain-drawings-v1:XAUUSD:M5') || '[]').length)).toBe(1);
  await p1.getByRole('button', {name: 'EMA on'}).click(); await expect(p1).toContainText('EMA off');
  await page.getByRole('button', {name: /Sync on/}).click(); await expect(page.getByRole('button', {name: /Sync off/})).toBeVisible();
  const data = JSON.stringify({trades: [{symbol:'XAUUSD',side:'BUY',entry_time:time - 120,entry_price:2500,exit_time:time - 60,exit_price:2501,pnl:2}]});
  await page.locator('input[type=file]').setInputFiles({ name:'journal.json', mimeType:'application/json', buffer:Buffer.from(data) });
  await expect(page.getByText(/2 markers/)).toBeVisible();
  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trading-brain-drawings-v1:XAUUSD:M1') || '[]').length)).toBe(1);
  await page.getByLabel('SYMBOL').selectOption('EURUSD'); await expect(page.getByText('Euro / US Dollar')).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile charts stack M5 before M1 and remain navigable', async ({ page }) => {
  await page.setViewportSize({width: 390, height: 844}); await page.goto('/chart');
  const left = await page.getByLabel('M5 chart').boundingBox(), right = await page.getByLabel('M1 chart').boundingBox();
  expect(left).not.toBeNull(); expect(right).not.toBeNull(); expect(right!.y).toBeGreaterThan(left!.y + left!.height - 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('link', {name: 'Monitor'}).click(); await expect(page).toHaveURL(/\/dashboard$/);
});
