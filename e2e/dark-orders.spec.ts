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
