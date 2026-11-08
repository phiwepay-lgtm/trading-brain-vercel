import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('hypothetical optimizer, tooltip, exporter and classified chart markers', async ({page})=>{
  const now=Math.floor(Date.now()/60000)*60000;
  const trades=[
    {symbol:'GOLD',openedAt:new Date(now-60000).toISOString(),dir:'sell',entryType:'BT 0.382',exec:'VLB + Engulf Trigger',status:'Full TP',outcome:'win',pnl:12,realR:2,notes:'PRIVATE-FIXTURE'},
    {symbol:'GOLD',openedAt:new Date(now-120000).toISOString(),dir:'buy',entryType:'BT 0.382',exec:'VHB + Engulf Trigger',status:'SL',outcome:'loss',pnl:-3,realR:-1},
    {symbol:'GOLD',openedAt:new Date(now-180000).toISOString(),dir:'sell',entryType:'FTB 0.382',exec:'VLB + Engulf Trigger',status:'BE',outcome:'be',pnl:0,realR:0},
    {symbol:'GOLD',openedAt:new Date(now-240000).toISOString(),dir:'buy',entryType:'BT 0.382',exec:'VLB + Engulf Trigger',status:'Full TP',outcome:'loss'},
    {symbol:'GOLD',openedAt:new Date(now-300000).toISOString(),dir:'buy',entryType:'BT 0.382',exec:'VHB + Engulf Trigger',outcome:'win'}
  ];
  await page.goto('/dashboard');
  const rr=page.getByLabel('R:R Optimizer');
  await expect(rr).toContainText('0/0 records'); await expect(rr).toContainText('not a backtest');
  const slider=rr.getByLabel('Target reward per 1R risk');
  await expect(slider).toHaveAttribute('min','2'); await expect(slider).toHaveAttribute('max','7'); await expect(slider).toHaveAttribute('step','0.1');
  await page.locator('.journal-view input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(trades))});
  await expect(rr).toContainText('3/5 records');await expect(rr).toContainText('6.00 R');await expect(rr).toContainText('1 without explicit Full TP/SL/BE and 1 with conflicting labels');
  await slider.focus();await slider.press('Home');await slider.press('ArrowUp');await expect(rr).toContainText('1:2.1');await expect(rr).toContainText('1.10 R');await expect(rr).toContainText('32.3%');
  const exportText=page.getByLabel('Generated system text');await expect(exportText).toHaveValue(/TP: 1:2\.1 — selected hypothetical target/);
  await expect(exportText).toHaveValue(/ATR period\/multiplier and choice are unspecified/);await expect(exportText).toHaveValue(/New York 14:00–16:00/);await expect(exportText).not.toHaveValue(/PRIVATE-FIXTURE/);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download text'}).click();const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('trading-system.txt');expect(await readFile((await download.path())!,'utf8')).toContain('selected hypothetical target');
  const vlb=page.getByRole('button',{name:'Filter By execution VLB + Engulf Trigger'});await vlb.focus();await expect(page.getByLabel('By execution').getByRole('tooltip')).toContainText('M1 BOS/CHoCH breaks low');
  const vhb=page.getByRole('button',{name:'Filter By execution VHB + Engulf Trigger'});await vhb.hover();await expect(page.getByLabel('By execution').getByRole('tooltip')).toContainText('pullback (sometimes none)');
  await page.getByRole('link',{name:'Chart workspace'}).click();await page.getByRole('button',{name:'Skip - Use Demo'}).click();
  await expect(page.getByText(/1 direction conflicts/)).toBeVisible();
  await page.getByLabel('M1 trade markers').click();const list=page.locator('.marker-list[open]');
  await expect(list).toContainText('VLB Sell - BOS low + Engulf to new LL');await expect(list).toContainText('VHB Buy - BOS high + Engulf to new HH');await expect(list).toContainText('FTB - Failed to break new structure then continue');await expect(list).toContainText('Direction conflict - BUY / VLB');await expect(list).toContainText('recorded label; not pattern-verified');
});

test('all ratios tie when eligible outcomes contain no Full TP',async({page})=>{
  await page.goto('/dashboard');
  await page.locator('.journal-view input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{status:'SL'},{status:'BE'}]))});
  const rr=page.getByLabel('R:R Optimizer');await expect(rr).toContainText('All ratios tie');await expect(rr).toContainText('-1.00 R');
});
