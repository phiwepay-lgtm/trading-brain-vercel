import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const retiredFiles = [
  'Dark_Orders_Candle_Body.pine',
  'TradingBrain_Confirmed_Edge_Research.pine',
  'TradingBrain_Pro_V1_Indicator.pine',
  'TradingBrain_Pro_V1_Strategy.pine',
  'TradingBrain_Pro_V1_Indicator.mq5',
  'TradingBrain_Pro_V1_Tester.mq5',
];

test('EA Center offers Dark Orders but not retired tools', async ({ page, request }) => {
  await page.goto('/ea');
  await expect(page.getByRole('heading', { name: /Dark Orders/ })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Dark Orders' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('Dark_Orders_Pure_Price.pine');
  expect(await readFile((await download.path())!, 'utf8')).toContain('indicator("Dark Orders Pure Price + History [Blackwatch]"');
  await expect(page.locator('.ea-download-card a[download]')).toHaveCount(1);
  for (const file of retiredFiles) expect((await request.get(`/ea/${file}`)).status()).toBe(404);
});

test('Dark Orders source can be previewed and copied', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text; } } }));
  await page.goto('/ea');
  await page.getByRole('button', { name: 'Show Dark Orders code' }).click();
  const code = page.getByLabel('Dark Orders Pine code');
  await expect(code).toHaveValue(/^\/\/@version=5\r?\nindicator\("Dark Orders Pure Price \+ History \[Blackwatch\]"/);
  await page.getByRole('button', { name: 'Copy Dark Orders code' }).click();
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(await code.inputValue());
});

test('EA Center fits a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/ea');
  await expect(page.getByRole('link', { name: 'Download Dark Orders' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
