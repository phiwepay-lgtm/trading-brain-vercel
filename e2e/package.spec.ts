import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';

test('downloads four local specification files with the current hypothetical ratio and no raw journal',async({page})=>{
  await page.goto('/dashboard');
  await page.locator('.journal-view input[type=file]').setInputFiles({name:'private.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{status:'Full TP',outcome:'win',notes:'PRIVATE-JOURNAL-NOTE',pnl:12}]))});
  const slider=page.getByLabel('Target reward per 1R risk');await slider.focus();await slider.press('Home');await slider.press('ArrowUp');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download EA Package (ZIP)'}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe('TradingBrain_Full_Package.zip');
  const zip=await JSZip.loadAsync(await readFile((await download.path())!));expect(Object.keys(zip.files).sort()).toEqual(['README.txt','TradingBrain.mq5','TradingBrain_GOLD_M1_VLB_VHB.pine','system.json']);
  const json=await zip.file('system.json')!.async('string');const system=JSON.parse(json);
  expect(system.risk.selected_hypothetical_r).toBe(2.1);expect(system.stats_source.verified).toBe(false);expect(system.stats_source.trades).toBe(1);
  expect(system.exec.VLB.side).toBe('SELL');expect(system.exec.VHB.side).toBe('BUY');
  const readme=await zip.file('README.txt')!.async('string'),pine=await zip.file('TradingBrain_GOLD_M1_VLB_VHB.pine')!.async('string');
  expect(readme).toContain('METATRADER 5');expect(readme).toContain('NOT implemented');expect(pine).toContain('comment-only skeleton');
  expect(json+readme+pine).not.toContain('PRIVATE-JOURNAL-NOTE');
});
