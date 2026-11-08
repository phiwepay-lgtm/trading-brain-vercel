import { test, expect } from '@playwright/test';
const TOKEN = 'test-token-contains-24-characters';

test('default chart falls back to visibly simulated data without keys', async ({ page, request }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page).toHaveURL(/\/chart$/);
  await page.getByLabel('SYMBOL').selectOption('EURUSD');
  await expect(page.getByRole('status')).toContainText('Using demo feed');
  await page.getByRole('button', {name:'Skip - Use Demo'}).click();
  await expect(page.getByLabel('M5 chart')).toContainText('M5 — Heiken Ashi — 21 EMA');
  await expect(page.getByLabel('M1 chart')).toContainText('M1 — Candles — 9 EMA');
  await expect(page.getByRole('status')).toContainText('Using demo feed');
  await expect(page.getByText('DEMO · SIMULATED')).toHaveCount(2);
  await expect(page.getByText('No market data to display')).toHaveCount(0);
  await expect(page.getByText('MT5 OFFLINE')).toBeVisible();
  expect((await request.get('/api/chart/candles?symbol=bad&timeframe=M1')).status()).toBe(400);
  const result = await request.get('/api/chart/candles?symbol=EURUSD&timeframe=M1');
  expect(result.headers()['x-chart-source']).toBe('demo'); expect((await result.json())).toHaveLength(500);
  const price = await (await request.get('/api/chart/price?symbol=EURUSD')).json(); expect(price.is_demo).toBe(true);
  expect((await request.get('/api/chart/stream?symbol=XAUUSD')).status()).toBe(503);
  expect(errors).toEqual([]);
});

test('mocked feed updates both charts, drawing persistence, copy, journal and controls', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const time = Math.floor(Date.now() / 1000 / 60) * 60;
  await page.route('**/api/chart/candles?**', async route => {
    const url = new URL(route.request().url()), tf = url.searchParams.get('timeframe'), seconds = tf === 'M5' ? 300 : 60;
    const end = url.searchParams.has('before') ? Number(url.searchParams.get('before')) - seconds : Math.floor(time / seconds) * seconds;
    const rows = Array.from({length: 500}, (_, i) => ({time: end - (499 - i) * seconds, open: 2500 + i * .001, high: 2502 + i * .001, low: 2498 + i * .001, close: 2501 + i * .001, volume: null}));
    await route.fulfill({ status: 200, headers: {'X-Chart-Source':'binance','X-Chart-Instrument':'PAXGUSDT'}, json: rows });
  });
  await page.route('**/api/chart/price?**', async route => {
    await route.fulfill({status: 200, json: {source:'binance',time,last:2501.75,bid:2501.70,ask:2501.80}});
  });
  await page.addInitScript(token => sessionStorage.setItem('chart-access-token', token), TOKEN);
  await page.goto('/chart');
  await page.getByLabel('SYMBOL').selectOption('XAUUSD');
  await expect(page.getByText('2501.75')).toBeVisible();
  await expect(page.getByText('2501.70')).toBeVisible();
  await expect(page.getByText('2501.80')).toBeVisible();
  const p1 = page.getByLabel('M1 chart');
  await p1.locator('.chart-host').hover({position: {x: 300, y: 180}});
  await expect(p1.locator('.pane-sub')).toContainText('O ');
  await expect(page.getByLabel('M5 chart').locator('.pane-sub')).toContainText('O ');
  await p1.getByRole('button', {name: 'M1 Horizontal line'}).click();
  const canvas = p1.locator('.drawing-layer'); await canvas.click({position: {x: 200, y: 180}});
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trading-brain-drawings-v1:XAUUSD:M1') || '[]').length)).toBe(1);
  await p1.getByRole('button', {name: 'Copy M1 drawings to M5'}).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trading-brain-drawings-v1:XAUUSD:M5') || '[]').length)).toBe(1);
  await p1.getByRole('button', {name: 'EMA on'}).click(); await expect(p1).toContainText('EMA off');
  await page.getByRole('button', {name: /Sync on/}).click(); await expect(page.getByRole('button', {name: /Sync off/})).toBeVisible();
  const data = JSON.stringify({trades: [{symbol:'XAUUSD',side:'BUY',entry_time:time - 120,entry_price:2500,exit_time:time - 60,exit_price:2501,pnl:2}]});
  await page.locator('input[type=file]').setInputFiles({ name:'journal.json', mimeType:'application/json', buffer:Buffer.from(data) });
  await expect(page.getByText(/1 trades loaded/)).toBeVisible();
  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trading-brain-drawings-v1:XAUUSD:M1') || '[]').length)).toBe(1);
  await page.getByLabel('SYMBOL').selectOption('EURUSD'); await expect(page.getByText('Euro / US Dollar')).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile charts stack M5 before M1 and remain navigable', async ({ page }) => {
  await page.setViewportSize({width: 390, height: 844}); await page.goto('/chart');
  const left = await page.getByLabel('M5 chart').boundingBox(), right = await page.getByLabel('M1 chart').boundingBox();
  expect(left).not.toBeNull(); expect(right).not.toBeNull(); expect(right!.y).toBeGreaterThan(left!.y + left!.height - 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('link', {name: 'Monitor'}).click(); await expect(page).toHaveURL(/\/dashboard$/);
});


test('research history loads from one source, with close-only overlay controls', async ({ page }) => {
  const time = Math.floor(Date.now() / 300000) * 300;
  await page.route('**/api/chart/candles?**', async route => {
    const url = new URL(route.request().url()), tf = url.searchParams.get('timeframe'), seconds = tf === 'M5' ? 300 : 60;
    const end = url.searchParams.has('before') ? Number(url.searchParams.get('before')) - seconds : time;
    const rows = Array.from({length:500},(_,i)=>({time:end-(499-i)*seconds,open:10,high:12+(i%9===0?2:0),low:8-(i%9===4?2:0),close:11,volume:null}));
    await route.fulfill({status:200,headers:{'X-Chart-Source':'binance','X-Chart-Instrument':'BTCUSDT'},json:rows});
  });
  await page.route('**/api/chart/price?**', route => route.fulfill({status:200,json:{source:'binance',time,last:11,bid:10,ask:12}}));
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/chart');
  await expect(page.getByLabel('SYMBOL')).toHaveValue('BTCUSD');
  await expect(page.getByText(/Research history loaded/)).toBeVisible();
  const counts=(await page.getByText(/Research history loaded/).innerText()).match(/M1: (\d+)\/2,000 · M5: (\d+)\/5,000/);
  expect(counts).not.toBeNull(); expect(Number(counts![1])).toBeGreaterThanOrEqual(2000); expect(Number(counts![2])).toBeGreaterThanOrEqual(5000);
  await expect(page.getByText(/not trade signals/)).toBeVisible();
  await page.getByRole('button',{name:'M1 only'}).click(); await expect(page.getByLabel('M5 chart')).toHaveCount(0);
  await page.getByRole('button',{name:'M5 only'}).click(); await expect(page.getByLabel('M1 chart')).toHaveCount(0);
  await page.getByRole('button',{name:'Both charts'}).click();
  await page.getByRole('button',{name:'M5 HA on M1 off'}).click();
  await expect(page.getByRole('button',{name:'M5 HA on M1 on'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Session shading off'}).click();
  await page.getByRole('button',{name:'Pivots on'}).click();
  await expect(page.getByRole('button',{name:'Pivots off'})).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Active M5 levels on'}).click();
  await expect(page.getByRole('button',{name:'Active M5 levels off'})).toHaveAttribute('aria-pressed','false');
  expect(errors).toEqual([]);
});

test('research replay, URL parameters and explicitly hypothetical simulation', async ({ page }) => {
  const base=Math.floor(Date.now()/300000)*300-226*300;
  const m5=Array.from({length:225},(_,i)=>{let x=10;if(i===212)x=5;if(i===215)x=20;if(i===219)x=22;return {time:base+i*300,open:x,high:x,low:x,close:x,volume:null};});
  const m1=Array.from({length:45},(_,i)=>({time:base+216*300+i*60,open:14,high:15,low:13,close:14,volume:null}));
  m1[12].high=18;m1[17].high=17;
  Object.assign(m1[21],{open:15.2,high:16,low:15,close:15.3});Object.assign(m1[22],{open:15.3,high:18,low:15,close:17.5});
  Object.assign(m1[23],{open:15.5,high:15.6,low:15.1,close:15.2});Object.assign(m1[24],{open:15.1,high:15.7,low:15,close:15.6});
  Object.assign(m1[25],{open:15.6,high:18,low:15.2,close:17});
  await page.route('**/api/chart/candles?**',route=>route.fulfill({status:200,headers:{'X-Chart-Source':'binance','X-Chart-Instrument':'BTCUSDT'},json:new URL(route.request().url()).searchParams.get('timeframe')==='M1'?m1:m5}));
  await page.route('**/api/chart/price?**',route=>route.fulfill({status:200,json:{source:'binance',time:base+225*300,last:14,bid:13,ask:15}}));
  await page.goto('/chart');
  const panel=page.getByLabel('Strategy research');
  await expect(panel).toContainText('CHoCH / ENTRIES');
  await panel.getByText(/Candidate timeline/).click();
  await expect(panel.getByText('VHB',{exact:true})).toBeVisible();await expect(panel.getByText('ENTRY',{exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'Run candle simulation'}).click();
  await expect(panel).toContainText('Hypothetical candle simulation');await expect(panel).toContainText('Not MT5 fills or verified performance');
  await expect(panel.getByLabel('Simulated equity curve in R')).toBeVisible();
  await panel.getByText('Strategy parameters',{exact:true}).click();
  await panel.getByLabel('Entry edge').selectOption('ftb');
  await panel.getByRole('button',{name:'Apply & recompute'}).click();
  await expect(page).toHaveURL(/tb_edge=ftb/);
  await expect(panel.getByText('ENTRY',{exact:true})).toHaveCount(0);
  await page.reload();await panel.getByText('Strategy parameters',{exact:true}).click();
  await expect(panel.getByLabel('Entry edge')).toHaveValue('ftb');
});
