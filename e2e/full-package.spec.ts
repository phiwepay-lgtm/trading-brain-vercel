import { test, expect } from '@playwright/test';

const retiredFiles = [
  'TradingBrain_Confirmed_Edge_Research.pine',
  'TradingBrain_Pro_V1_Indicator.pine',
  'TradingBrain_Pro_V1_Strategy.pine',
  'TradingBrain_Pro_V1_Indicator.mq5',
  'TradingBrain_Pro_V1_Tester.mq5',
];

test('EA Center no longer exposes the retired tools', async ({ page, request }) => {
  await page.goto('/ea');
  await expect(page.getByRole('heading', { name: /No tools available yet/ })).toBeVisible();
  await expect(page.locator('.ea-download-card a[download]')).toHaveCount(0);
  await expect(page.locator('.ea-download-card button')).toHaveCount(0);
  for (const file of retiredFiles) {
    expect((await request.get(`/ea/${file}`)).status()).toBe(404);
  }
});

test('empty EA Center fits a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/ea');
  await expect(page.getByRole('heading', { name: /No tools available yet/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
