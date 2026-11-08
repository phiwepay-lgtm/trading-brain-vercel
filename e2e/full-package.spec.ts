import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';

test('download center presents current research drafts and working source downloads',async({page,request})=>{
  await page.goto('/ea');
  await expect(page.getByText('v15.3 DRAFTS')).toBeVisible();
  for (const name of ['TradingBrain.mq5','TradingBrain_GOLD_M1_VLB_VHB.pine','TradingBrain_Strategy.pine','TradingBrain_M5_M1_v14.pine','TradingBrain-v15-BT-FTB-Full.zip']) await expect(page.getByText(name,{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Download Full Package (ZIP)'})).toHaveCount(0);
  await expect(page.getByText(/not equivalent to the MT5 draft/)).toBeVisible();
  const eaPending=page.waitForEvent('download');await page.getByRole('link',{name:'Download Tester EA (.mq5)'}).click();const ea=await eaPending;
  expect(ea.suggestedFilename()).toBe('TradingBrain_Tester_v153.mq5');
  const eaSource=await readFile((await ea.path())!,'utf8');expect(eaSource).toContain('Strategy Tester only; no live or demo operation');
  const pinePending=page.waitForEvent('download');await page.getByRole('link',{name:'Download Pine Draft (.pine)'}).click();const pine=await pinePending;
  expect(pine.suggestedFilename()).toBe('TradingBrain_M5_M1_v15.pine');expect(await readFile((await pine.path())!,'utf8')).toContain('TradingBrain v15.3');
  const pending=page.waitForEvent('download');await page.getByRole('link',{name:'Download MT5 Tester Kit (.zip)'}).click();const download=await pending;
  expect(download.suggestedFilename()).toBe('TradingBrain-MT5-v153-Tester.zip');
  const zip=await JSZip.loadAsync(await readFile((await download.path())!));
  expect(Object.values(zip.files).filter(f=>!f.dir).map(f=>f.name).sort()).toEqual(['Docs/MT5-Strategy-Tester-Guide.md','Experts/TradingBrain_Tester_v153.mq5','Presets/TradingBrain_v153_BT_Only.set','Presets/TradingBrain_v153_BT_RR2.set','Presets/TradingBrain_v153_BT_RR5.set','Presets/TradingBrain_v153_BT_RR7.set','Presets/TradingBrain_v153_Both.set','Presets/TradingBrain_v153_FTB_Only.set']);
  expect(await zip.file('Experts/TradingBrain_Tester_v153.mq5')!.async('string')).toBe(eaSource);
  const instructions=await (await request.get('/ea/README.txt')).text();expect(instructions).toContain('TRADING BRAIN - v15.3 RESEARCH TOOLKIT');expect(instructions).toContain('bearish BT structure and fib anchor differ');
  // Old direct links remain accessible; they are not offered as current downloads.
  expect((await request.get('/ea/TradingBrain_M5_M1_v14.pine')).status()).toBe(200);
  await page.locator('.ea-current-chart').getByRole('link',{name:'Open chart'}).click();await expect(page).toHaveURL(/\/chart$/);
});

test('legacy dashboard package retains aggregate-only behavior and its matching legacy guide',async({page})=>{
  const trades=[{status:'Full TP',outcome:'win',pnl:20,realR:2,notes:'PRIVATE-TEST-NOTE'}, {status:'SL',outcome:'loss',pnl:-10,realR:-1}];
  await page.goto('/dashboard');await page.locator('.journal-view input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(trades))});
  await expect(page.getByLabel('Brain Learning Status')).toContainText('2 trades analyzed');
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download legacy EA Package (ZIP)'}).click();const download=await pending;
  const zip=await JSZip.loadAsync(await readFile((await download.path())!));
  const contents=await Promise.all(Object.values(zip.files).map(f=>f.async('string')));expect(contents.join(' ')).not.toContain('PRIVATE-TEST-NOTE');
  const s=JSON.parse(await zip.file('system.json')!.async('string'));expect(s.stats_source).toMatchObject({status:'uploaded_journal',verified:false,trades:2,total_pnl:10,full_tp_count:1,full_tp_denominator:2,winrate_full_tp:50,avg_R:0.5,profit_factor:2});
  expect(await zip.file('README.txt')!.async('string')).toContain('M5/M1 VISUAL SCANNER SOURCE PACKAGE');
});

test('legacy dashboard package reports a source failure instead of downloading incomplete ZIP',async({page})=>{
  await page.goto('/dashboard');await page.route('**/ea/TradingBrain.mq5',route=>route.fulfill({status:503,body:'unavailable'}));
  await page.getByRole('button',{name:'Download legacy EA Package (ZIP)'}).click();await expect(page.getByText('Could not load TradingBrain.mq5.')).toBeVisible();
});

test('current downloads remain usable on a narrow screen',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/ea');
  await expect(page.getByRole('link',{name:'Download MT5 Tester Kit (.zip)'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Download Pine Draft (.pine)'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
