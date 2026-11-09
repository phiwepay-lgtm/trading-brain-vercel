import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Dark Orders is available at home and the original EA Center path', async ({ page, request }) => {
  for (const url of ['/', '/ea']) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: 'Dark Orders.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Dark Orders' })).toHaveAttribute('href', '/ea/Dark_Orders_Pure_Price.pine');
  }
  const response = await request.get('/ea/Dark_Orders_Pure_Price.pine');
  expect(await response.text()).toBe(await readFile('public/ea/Dark_Orders_Pure_Price.pine', 'utf8'));
  expect((await request.get('/ea/TradingView_Algo_V3_Study_Indicator.pine')).status()).toBe(404);
  expect((await request.get('/dashboard')).status()).toBe(404);
});

test('code preview and copy work without appending to an existing script', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text; } } }));
  await page.goto('/ea');
  await page.getByRole('button', { name: 'Show Dark Orders code' }).click();
  const code = page.getByLabel('Dark Orders Pine code');
  await expect(code).toHaveValue(/^\/\/@version=5\r?\nindicator\("Dark Orders Pure Price/);
  await page.getByRole('button', { name: 'Copy Dark Orders code' }).click();
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(await code.inputValue());
});

test('page fits a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('separate Trend Predictor can be previewed and downloaded', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open Trend Predictor' }).click();
  await expect(page.getByRole('heading', { name: 'Trend Predictor.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download Trend Predictor' })).toHaveAttribute('href', '/ea/Trend_Predictor.pine');
  await page.getByRole('button', { name: 'Show Trend Predictor code' }).click();
  await expect(page.getByLabel('Trend Predictor Pine code')).toHaveValue(/^\/\/@version=6/);
  const response = await request.get('/ea/Trend_Predictor.pine');
  expect(await response.text()).toBe(await readFile('public/ea/Trend_Predictor.pine', 'utf8'));
});

test('two-in-one offers separate Pine and Indie sources', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open two-in-one' }).click();
  await expect(page.getByRole('heading', { name: 'Two in one.' })).toBeVisible();
  await page.getByRole('button', { name: 'Show TradingView Pine code' }).click();
  await expect(page.getByLabel('TradingView Pine code')).toHaveValue(/^\/\/@version=6/);
  await page.getByRole('button', { name: 'Show Indie draft code' }).click();
  await expect(page.getByLabel('Indie draft code')).toHaveValue(/^# indie:lang_version = 5/);
  for (const name of ['Dark_Orders_Trend_Predictor.pine', 'Dark_Orders_Trend_Predictor.indie.txt']) {
    const response = await request.get(`/ea/${name}`);
    expect(await response.text()).toBe(await readFile(`public/ea/${name}`, 'utf8'));
  }
});

test('session range offers separate Pine and Indie files', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open My Session Range' }).click();
  await expect(page.getByRole('heading', { name: 'My Session Range.' })).toBeVisible();
  await page.getByRole('button', { name: 'Show TradingView Pine code' }).click();
  await expect(page.getByLabel('TradingView Pine code')).toHaveValue(/^\/\/@version=6/);
  await page.getByRole('button', { name: 'Show Indie draft code' }).click();
  await expect(page.getByLabel('Indie draft code')).toHaveValue(/^# indie:lang_version = 5/);
  for (const name of ['Blackwatch_My_Session_Range.pine', 'Blackwatch_My_Session_Range.indie.txt']) {
    const response = await request.get(`/ea/${name}`);
    expect(await response.text()).toBe(await readFile(`public/ea/${name}`, 'utf8'));
  }
});

test('Supertrend tester package is separate and discloses restrictions', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open Supertrend tester' }).click();
  await expect(page.getByRole('heading', { name: 'Supertrend EA.' })).toBeVisible();
  await expect(page.getByText('Not a complete port.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download MT5 research package' })).toHaveAttribute('href', '/ea/Supertrend_HA_Tester_Research.zip');
  expect((await request.get('/ea/Supertrend_HA_Tester_Research.zip')).status()).toBe(200);
});
