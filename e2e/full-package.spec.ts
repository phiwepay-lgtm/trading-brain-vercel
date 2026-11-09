import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const files = [
  {name:'TradingView Indicator', file:'TradingBrain_Pro_V1_Indicator.pine'},
  {name:'TradingView Strategy', file:'TradingBrain_Pro_V1_Strategy.pine'},
  {name:'MT5 Indicator', file:'TradingBrain_Pro_V1_Indicator.mq5'},
  {name:'MT5 Tester Algo', file:'TradingBrain_Pro_V1_Tester.mq5'},
];
test('Download Center offers only four clearly unverified Pro V1 sources',async({page,request})=>{
  await page.goto('/ea');
  await expect(page.getByText('PRO V1 · DRAFT')).toBeVisible();
  await expect(page.getByText(/have not been compiled or tested in TradingView or MT5/)).toBeVisible();
  for(const item of files){
    const pending=page.waitForEvent('download');
    await page.getByRole('link',{name:`Download ${item.name}`}).click();
    const download=await pending;
    expect(download.suggestedFilename()).toBe(item.file);
    const content=await readFile((await download.path())!,'utf8');
    expect(content).toContain('Pro V1');
  }
  for(const old of ['TradingBrain_M5_M1_v14.pine','TradingBrain_Tester_v153.mq5','TradingBrain-MT5-v153-Tester.zip','TradingBrain.mq5','TradingBrain_Visual_Draft.tpl','README.txt']) {
    expect((await request.get(`/ea/${old}`)).status()).toBe(404);
  }
  await expect(page.locator('.ea-current-chart').getByRole('link',{name:'Open tester'})).toHaveAttribute('href','/tester');
});

test('current Pro V1 downloads remain usable on a narrow screen',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/ea');
  for(const item of files) await expect(page.getByRole('link',{name:`Download ${item.name}`})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('TradingView code preview and copy use the correct Pine source',async({page})=>{
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async (text:string)=>{
      (window as unknown as {copiedPine:string}).copiedPine=text;
    }}});
  });
  await page.goto('/ea');
  await expect(page.getByText(/Pasting MQL5 into Pine Editor causes a syntax error/)).toBeVisible();
  await page.getByRole('button',{name:'Show TradingView Indicator code'}).click();
  const indicator=page.getByLabel('TradingView Indicator Pine code');
  await expect(indicator).toHaveValue(/^\/\/@version=5\r?\nindicator\(/);
  const indicatorText=await indicator.inputValue();
  expect(indicatorText).not.toContain('#property strict');
  await page.getByRole('button',{name:'Copy TradingView Indicator code'}).click();
  expect(await page.evaluate(()=>(window as unknown as {copiedPine:string}).copiedPine)).toBe(indicatorText);
  await expect(page.getByText(/Copied\. In Pine Editor press Ctrl\+A/)).toBeVisible();
  await page.getByRole('button',{name:'Show TradingView Strategy code'}).click();
  const strategy=page.getByLabel('TradingView Strategy Pine code');
  await expect(strategy).toHaveValue(/^\/\/@version=5\r?\nstrategy\(/);
  await page.getByRole('button',{name:'Copy TradingView Strategy code'}).click();
  expect(await page.evaluate(()=>(window as unknown as {copiedPine:string}).copiedPine)).toBe(await strategy.inputValue());
});

test('wrong source is rejected and clipboard failure keeps manual-copy fallback',async({page})=>{
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async ()=>{throw new Error('denied');}}});
  });
  await page.route('**/ea/TradingBrain_Pro_V1_Indicator.pine',route=>route.fulfill({status:200,body:'#property strict\ninput bool x = true;'}));
  await page.goto('/ea');
  await page.getByRole('button',{name:'Show TradingView Indicator code'}).click();
  await expect(page.getByText('The source did not match the expected TradingView file. Nothing was copied.')).toBeVisible();
  await expect(page.getByLabel('TradingView Indicator Pine code')).toHaveCount(0);
  await page.getByRole('button',{name:'Show TradingView Strategy code'}).click();
  await page.getByRole('button',{name:'Copy TradingView Strategy code'}).click();
  await expect(page.getByText(/Clipboard access was blocked/)).toBeVisible();
  await expect(page.getByLabel('TradingView Strategy Pine code')).toHaveValue(/^\/\/@version=5/);
});
