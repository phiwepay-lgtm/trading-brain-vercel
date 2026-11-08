import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';

async function packageDownload(page: import('@playwright/test').Page) {
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download Full Package (ZIP)'}).click();
  const download=await pending;expect(download.suggestedFilename()).toBe('TradingBrain_Full_Package.zip');
  const zip=await JSZip.loadAsync(await readFile((await download.path())!));
  expect(Object.keys(zip.files).sort()).toEqual(['README.txt','TradingBrain.mq5','TradingBrain_GOLD_M1_VLB_VHB.pine','TradingBrain_Strategy.pine','system.json']);
  return zip;
}
test('download center exports matching source files and unavailable stats without a journal',async({page,request})=>{
  await page.goto('/ea');await expect(page.getByText('No journal uploaded in this browser', {exact:false})).toBeVisible();
  const pineDownload=page.waitForEvent('download');await page.getByRole('link',{name:'Download Pine Script (.pine)'}).click();const pine=await pineDownload;
  expect(pine.suggestedFilename()).toBe('TradingBrain_GOLD_M1_VLB_VHB.pine');
  const expectedPine=await readFile((await pine.path())!,'utf8');
  const strategyDownload=page.waitForEvent('download');await page.getByRole('link',{name:'Download Strategy (.pine)'}).click();const strategy=await strategyDownload;
  expect(strategy.suggestedFilename()).toBe('TradingBrain_Strategy.pine');
  const expectedStrategy=await readFile((await strategy.path())!,'utf8');
  const v14Download=page.waitForEvent('download');await page.getByRole('link',{name:'Download v14 Draft (.pine)'}).click();const v14=await v14Download;
  expect(v14.suggestedFilename()).toBe('TradingBrain_M5_M1_v14.pine');
  expect(await readFile((await v14.path())!,'utf8')).toContain('WAITING_CHOCH');
  const v15Download=page.waitForEvent('download');await page.getByRole('link',{name:'Download v15 Draft (.pine)'}).click();const v15=await v15Download;
  expect(v15.suggestedFilename()).toBe('TradingBrain_M5_M1_v15.pine');
  expect(await readFile((await v15.path())!,'utf8')).toContain('FTB_FOUND');
  const v15ZipPending=page.waitForEvent('download');await page.getByRole('link',{name:'Download v15 Source Package (.zip)'}).click();const v15DownloadZip=await v15ZipPending;
  expect(v15DownloadZip.suggestedFilename()).toBe('TradingBrain-v15-BT-FTB-Full.zip');
  const v15Zip=await JSZip.loadAsync(await readFile((await v15DownloadZip.path())!));
  expect(Object.values(v15Zip.files).filter(f=>!f.dir).map(f=>f.name).sort()).toEqual(['Docs/AUDIT-40records.txt','Docs/CHANGELOG-v15-BT-FTB.md','MQ5/TradingBrain_Tester_v15.mq5','MQ5/TradingBrain_v15.mq5','Pine/TradingBrain_Indicator_v15.pine','Pine/TradingBrain_M5_M1_v15.pine']);
  expect(await v15Zip.file('Pine/TradingBrain_M5_M1_v15.pine')!.async('string')).toBe(await readFile((await v15.path())!,'utf8'));
  const mt5Pending=page.waitForEvent('download');await page.getByRole('link',{name:'Download MT5 Tester Kit (.zip)'}).click();const mt5Download=await mt5Pending;
  expect(mt5Download.suggestedFilename()).toBe('TradingBrain-MT5-v153-Tester.zip');
  const mt5Zip=await JSZip.loadAsync(await readFile((await mt5Download.path())!));
  expect(Object.values(mt5Zip.files).filter(f=>!f.dir).map(f=>f.name).sort()).toEqual(['Docs/MT5-Strategy-Tester-Guide.md','Experts/TradingBrain_Tester_v153.mq5','Presets/TradingBrain_v153_BT_Only.set','Presets/TradingBrain_v153_BT_RR2.set','Presets/TradingBrain_v153_BT_RR5.set','Presets/TradingBrain_v153_BT_RR7.set','Presets/TradingBrain_v153_Both.set','Presets/TradingBrain_v153_FTB_Only.set']);
  expect(await mt5Zip.file('Experts/TradingBrain_Tester_v153.mq5')!.async('string')).toContain('Strategy Tester only; no live or demo operation');
  const zip=await packageDownload(page);
  expect(await zip.file('TradingBrain_Strategy.pine')!.async('string')).toBe(expectedStrategy);
  expect(await zip.file('TradingBrain_GOLD_M1_VLB_VHB.pine')!.async('string')).toBe(expectedPine);
  expect(await zip.file('TradingBrain.mq5')!.async('string')).toBe(await (await request.get('/ea/TradingBrain.mq5')).text());
  const json=JSON.parse(await zip.file('system.json')!.async('string'));expect(json.stats_source.status).toBe('not_uploaded');
  const guide=await zip.file('README.txt')!.async('string');expect(guide).toContain('METATRADER 5');expect(guide).toContain('TRADINGVIEW');expect(guide).toContain('not confirmed');
});
test('full ZIP calculates descriptive journal aggregates without exposing individual notes',async({page})=>{
  const trades=[{status:'Full TP',outcome:'win',pnl:20,realR:2,notes:'PRIVATE-TEST-NOTE'}, {status:'SL',outcome:'loss',pnl:-10,realR:-1}];
  await page.goto('/dashboard');await page.locator('.journal-view input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(trades))});
  await expect(page.getByLabel('Brain Learning Status')).toContainText('2 trades analyzed');await page.goto('/ea');
  await expect(page.getByText('2 uploaded journal records available', {exact:false})).toBeVisible();
  const zip=await packageDownload(page);const contents=await Promise.all(Object.values(zip.files).map(f=>f.async('string')));
  expect(contents.join(' ')).not.toContain('PRIVATE-TEST-NOTE');const s=JSON.parse(await zip.file('system.json')!.async('string'));
  expect(s.stats_source).toMatchObject({status:'uploaded_journal',verified:false,trades:2,total_pnl:10,full_tp_count:1,full_tp_denominator:2,winrate_full_tp:50,avg_R:0.5,profit_factor:2});
  expect(s.risk.selected_hypothetical_r).toBeNull();
});
test('package creation reports a source fetch failure without downloading an incomplete ZIP',async({page})=>{
  await page.goto('/ea');await page.route('**/ea/TradingBrain.mq5',route=>route.fulfill({status:503,body:'unavailable'}));
  await page.getByRole('button',{name:'Download Full Package (ZIP)'}).click();await expect(page.getByText('Could not load TradingBrain.mq5.')).toBeVisible();
});
test('download center remains usable on a narrow screen',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/ea');
  await expect(page.getByRole('link',{name:'Download Pine Script (.pine)'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Download Full Package (ZIP)'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
