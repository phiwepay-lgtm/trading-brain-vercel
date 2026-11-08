import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

function fixture(count=20000){let price=2300,seed=1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};return Array.from({length:count},(_,i)=>{const open=price,close=open+(random()-.5)*3,high=Math.max(open,close)+random(),low=Math.min(open,close)-random();price=close;return {time:1700000100+i*60,open,high,low,close};});}

test('local simulated CSV runs in browser, produces review and export without uploading the file',async({page})=>{
  const uploads:string[]=[];page.on('request',req=>{if(req.method()!=='GET')uploads.push(req.url());});
  await page.goto('/tester');await expect(page.getByText('No test run yet')).toBeVisible();
  const data=fixture();const csv='time,open,high,low,close\n'+data.map(b=>`${b.time},${b.open},${b.high},${b.low},${b.close}`).join('\n');
  await page.getByLabel('M1 history file').setInputFiles({name:'synthetic-demo.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByRole('button',{name:'Load local history'}).click();
  await expect(page.getByText('20,000 M1 candles')).toBeVisible({timeout:30000});
  await page.getByRole('button',{name:'Run strategy test'}).click();
  await expect(page.getByText('Research test complete.')).toBeVisible({timeout:30000});
  await expect(page.getByText('No test run yet')).toHaveCount(0);
  await expect(page.locator('.tester-metrics > div').first().locator('strong')).not.toHaveText('0');
  await expect(page.locator('.tester-price-chart canvas').first()).toBeVisible();
  await expect(page.getByRole('button',{name:'View'}).first()).toBeVisible();
  await page.getByRole('button',{name:'View'}).first().click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export trades CSV'}).click();
  const csvDownload=await downloadPromise;expect(csvDownload.suggestedFilename()).toBe('trading-brain-simulated-trades.csv');const csvText=await readFile((await csvDownload.path())!,'utf8');expect(csvText).toContain('entryObservedUtc');expect(csvText).toContain('closed');
  const htmlPending=page.waitForEvent('download');await page.getByRole('button',{name:'Download full report'}).click();const html=await htmlPending;expect(html.suggestedFilename()).toBe('trading-brain-simulated-report.html');const htmlText=await readFile((await html.path())!,'utf8');expect(htmlText).toContain('SIMULATION ONLY');expect(htmlText).toContain('not trades executed on a demo or live broker account');expect(htmlText).toContain('synthetic-demo.csv');
  const jsonPending=page.waitForEvent('download');await page.getByRole('button',{name:'Export report JSON'}).click();const json=await jsonPending;const report=JSON.parse(await readFile((await json.path())!,'utf8'));expect(report.source.name).toBe('synthetic-demo.csv');expect(report.positions.length).toBe(report.summary.acceptedPositions);expect(report.positions.length).toBeGreaterThan(0);expect(report.strategyParameters.tickSize).toBe(0.01);
  expect(uploads).toEqual([]);
  await page.getByLabel('Tick size').fill('0.02');await expect(page.getByText('No test run yet')).toBeVisible();
});

test('provider pagination is pinned to the explicit simulated source and reports coverage',async({page})=>{
  const data=fixture(2000);let calls=0;
  await page.route('**/api/chart/candles?*',async route=>{calls++;const url=new URL(route.request().url());expect(url.searchParams.get('source')).toBe('demo');const before=Number(url.searchParams.get('before'));const rows=data.filter(b=>b.time<before).slice(-500);await route.fulfill({status:200,contentType:'application/json',headers:{'X-Chart-Source':'demo','X-Chart-Instrument':'SYNTHETIC DEMO'},body:JSON.stringify(rows)});});
  await page.goto('/tester');await page.getByLabel('Provider').selectOption('demo');await page.getByLabel('Start date (UTC)').fill('2023-11-14');await page.getByLabel('End date inclusive (UTC)').fill('2023-11-15');
  await page.getByRole('button',{name:'Fetch provider history'}).click();
  await expect(page.getByText('SYNTHETIC DEMO · DEMO')).toBeVisible({timeout:30000});expect(calls).toBeGreaterThan(1);
  await expect(page.getByText(/Provider returned/)).toBeVisible();
  await page.getByRole('button',{name:'Run strategy test'}).click();await expect(page.getByText('Research test complete.')).toBeVisible({timeout:30000});
});

test('mobile tester is accessible and rejects unconfirmed local timestamps',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/tester');
  await page.getByLabel('M1 history file').setInputFiles({name:'times.csv',mimeType:'text/csv',buffer:Buffer.from('time,open,high,low,close\n2024-01-01 00:00,10,12,9,11\n')});
  await page.getByRole('button',{name:'Load local history'}).click();await expect(page.locator('.tester-alert[role=alert]')).toContainText('Timezone missing');
  await page.getByLabel('I confirm timezone-less file timestamps are UTC').check();await page.getByRole('button',{name:'Load local history'}).click();await expect(page.getByText('1 M1 candles')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Dukascopy daily requests fail closed and successful mock history identifies bid source',async({page})=>{
  let fail=true,calls=0;
  await page.route('**/api/tester/dukascopy?*',async route=>{calls++;const url=new URL(route.request().url());expect(url.searchParams.get('symbol')).toBe('XAUUSD');if(fail&&calls===3){await route.fulfill({status:502,body:'unavailable'});return;}const day=url.searchParams.get('day')!;const time=Date.parse(day+'T00:00:00Z')/1000;await route.fulfill({contentType:'application/json',headers:{'X-Chart-Source':'dukascopy','X-Chart-Instrument':'XAUUSD DUKASCOPY BID'},body:JSON.stringify([{time,open:2000,high:2001,low:1999,close:2000}])});});
  await page.goto('/tester');await page.getByLabel('Start date (UTC)').fill('2024-01-10');await page.getByLabel('End date inclusive (UTC)').fill('2024-01-10');await page.getByRole('button',{name:'Fetch provider history'}).click();
  await expect(page.locator('.tester-alert[role=alert]')).toContainText('No partial history was loaded');await expect(page.getByRole('button',{name:'Run strategy test'})).toBeDisabled();
  fail=false;calls=0;await page.getByRole('button',{name:'Fetch provider history'}).click();await expect(page.getByText('XAUUSD DUKASCOPY BID · DUKASCOPY')).toBeVisible();expect(calls).toBe(8);
});

test('explicit provider pagination continues beyond 100 pages without a silent cut',async({page})=>{
  test.setTimeout(90000);const data=fixture(56000);let calls=0;
  await page.route('**/api/chart/candles?*',async route=>{calls++;const before=Number(new URL(route.request().url()).searchParams.get('before'));const rows=data.filter(b=>b.time<before).slice(-500);await route.fulfill({status:200,contentType:'application/json',headers:{'X-Chart-Source':'demo','X-Chart-Instrument':'LONG SYNTHETIC DEMO'},body:JSON.stringify(rows)});});
  await page.goto('/tester');await page.getByLabel('Provider').selectOption('demo');await page.getByLabel('Start date (UTC)').fill('2023-11-15');await page.getByLabel('End date inclusive (UTC)').fill('2023-12-24');await page.getByRole('button',{name:'Fetch provider history'}).click();
  await expect(page.getByText('LONG SYNTHETIC DEMO · DEMO')).toBeVisible({timeout:70000});expect(calls).toBeGreaterThan(100);await expect(page.getByText('56,000 M1 candles')).toBeVisible();
});
