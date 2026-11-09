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
  await expect(page.getByRole('link', { name: 'Download Algo V2 indicator draft' })).toHaveAttribute('href', '/ea/TradingView_Algo_V2_Study_Indicator.pine');
  await expect(page.getByRole('link', { name: 'Download Algo V2 strategy draft' })).toHaveAttribute('href', '/ea/TradingView_Algo_V2_Study_Strategy.pine');
  await expect(page.getByRole('link', { name: 'Download MT5 research package' })).toHaveAttribute('href', '/ea/Algo_V1_MT5_Research.zip');
  await expect(page.getByRole('link', { name: 'Download the V2 tester EA (.mq5)' })).toHaveAttribute('href', '/ea/AlgoV2TesterResearch.mq5');
  await expect(page.getByRole('link', { name: 'MT5 indicator (.mq5)' })).toHaveAttribute('href', '/ea/AlgoV1Research.mq5');
  await expect(page.getByRole('link', { name: 'Download V3 reference' })).toHaveAttribute('href', '/ea/M5_HA_Brain_V3_User_Reference.pine');
  await expect(page.getByRole('link', { name: 'Download Algo V3 study' })).toHaveAttribute('href', '/ea/TradingView_Algo_V3_Study_Indicator.pine');
  await expect(page.locator('.ea-download-card a[download]')).toHaveCount(9);
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

test('tester CSV viewer opens a local file without uploading to the journal', async ({ page }) => {
  let journalRequests = 0;
  await page.route('**/api/journal/upload', route => { journalRequests++; return route.abort(); });
  await page.goto('/ea/results');
  const csv = 'time_broker,symbol,deal_id,position_id,deal_type,entry_type,volume,price,profit,commission,swap,currency,reason\n2026.11.09 10:01:00,XAUUSD,11,1,DEAL_TYPE_BUY,DEAL_ENTRY_IN,0.1,2000,0,-0.5,0,USD,DEAL_REASON_EXPERT\n';
  await page.locator('input[type=file]').setInputFiles({ name: 'deals.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByText('deals.csv · 1 deal event · showing first 1')).toBeVisible();
  await expect(page.getByText(/USD -0.5000/)).toBeVisible();
  expect(journalRequests).toBe(0);
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText(/deals.csv/)).toHaveCount(0);
});

test('Algo indicator and strategy sources can be previewed', async ({ page }) => {
  await page.goto('/ea');
  await page.getByRole('button', { name: 'Show Algo V2 indicator code' }).click();
  await expect(page.getByLabel('Algo V2 indicator Pine code')).toHaveValue(/^\/\/@version=5\r?\nindicator\(/);
  await page.getByRole('button', { name: 'Show Algo V2 strategy code' }).click();
  await expect(page.getByLabel('Algo V2 strategy Pine code')).toHaveValue(/^\/\/@version=5\r?\nstrategy\(/);
  await page.getByRole('button', { name: 'Show V3 reference code' }).click();
  await expect(page.getByLabel('V3 reference Pine code')).toHaveValue(/^\/\/@version=5\r?\nindicator\(/);
});
