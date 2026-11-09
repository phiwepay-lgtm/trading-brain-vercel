import {test,expect} from '@playwright/test';

test('Download Center is empty and former strategy files are no longer public',async({page,request})=>{
  await page.goto('/ea');
  await expect(page.getByRole('heading',{name:'No downloads available'})).toBeVisible();
  await expect(page.locator('a[download]')).toHaveCount(0);
  for(const old of ['TradingBrain_Pro_V1_Indicator.pine','TradingBrain_Pro_V1_Strategy.pine','TradingBrain_Pro_V1_Indicator.mq5','TradingBrain_Pro_V1_Tester.mq5','TradingBrain_Confirmed_Edge_Research.pine','TradingBrain_HA_Pullback_Strategy.pine','TradingBrain_HA_Pullback_Tester.mq5','TradingBrain_M5_M1_v14.pine','TradingBrain-MT5-v153-Tester.zip'])expect((await request.get(`/ea/${old}`)).status()).toBe(404);
  await expect(page.locator('.ea-current-chart').getByRole('link',{name:'Open tester'})).toHaveAttribute('href','/tester');
});
test('empty Download Center fits a narrow screen',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/ea');
  await expect(page.getByRole('heading',{name:'No downloads available'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
