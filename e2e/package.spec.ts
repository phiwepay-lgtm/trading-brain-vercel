import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';

test('downloads exactly three local specification files with the current hypothetical ratio and no raw journal',async({page})=>{
  await page.goto('/dashboard');
  await page.locator('.journal-view input[type=file]').setInputFiles({name:'private.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{status:'Full TP',outcome:'win',notes:'PRIVATE-JOURNAL-NOTE',pnl:12}]))});
  const slider=page.getByLabel('Target reward per 1R risk');await slider.focus();await slider.press('Home');await slider.press('ArrowUp');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download EA Package'}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe('trading-system-package.zip');
  const zip=await JSZip.loadAsync(await readFile((await download.path())!));expect(Object.keys(zip.files).sort()).toEqual(['README.txt','strategy.pine','system.json']);
  const json=await zip.file('system.json')!.async('string');const system=JSON.parse(json);
  expect(system.risk.selected_hypothetical_r).toBe(2.1);expect(system.stats_source.verified).toBe(false);expect(system.stats_source.trades).toBe(40);
  expect(system.exec.VLB.side).toBe('SELL');expect(system.exec.VHB.side).toBe('BUY');
  const readme=await zip.file('README.txt')!.async('string'),pine=await zip.file('strategy.pine')!.async('string');
  expect(readme).toContain('selected 1:2.1');expect(readme).toContain('not an MT5 EA');expect(pine).toContain('no automatic signals');
  expect(json+readme+pine).not.toContain('PRIVATE-JOURNAL-NOTE');
});
