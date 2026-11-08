const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { spawn } = require('node:child_process');
const path = require('node:path');
async function freePort() { const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port; }
test('REST source priority, explicit source, privacy and journal validation', {timeout:30000}, async t=>{
  const port=await freePort(), server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','-p',String(port),'-H','127.0.0.1'],{env:{...process.env,TWELVE_DATA_API_KEY:'test-provider-key',CHART_ACCESS_TOKEN:'test-chart-token-with-24-chars',NODE_OPTIONS:`--require ${path.join(__dirname,'mock-chart-provider.cjs')}`},stdio:'ignore'});
  t.after(()=>server.kill('SIGTERM'));const base=`http://127.0.0.1:${port}`;let ready=false;for(let i=0;i<100&&!ready;i++){try{ready=(await fetch(`${base}/api/status`)).ok;}catch{await new Promise(r=>setTimeout(r,100));}}assert.ok(ready,'Run npm run build first');
  const h={Authorization:'Bearer test-chart-token-with-24-chars'};
  assert.equal((await fetch(`${base}/api/chart/candles?symbol=XAUUSD&timeframe=M1&source=twelvedata`)).status,401);
  assert.equal((await fetch(`${base}/api/chart/candles?symbol=XAUUSD&timeframe=M5&before=garbage`,{headers:h})).status,400);
  const response=await fetch(`${base}/api/chart/candles?symbol=XAUUSD&timeframe=M1`,{headers:h});assert.equal(response.status,200);assert.equal(response.headers.get('x-chart-source'),'twelvedata');assert.match(response.headers.get('cache-control'),/no-store/);
  assert.deepEqual(await response.json(),[{time:1735819200,open:9,high:12,low:8,close:10,volume:7},{time:1735819260,open:10,high:13,low:9,close:12,volume:null}]);
  const proxy=await fetch(`${base}/api/chart/candles?symbol=XAUUSD&timeframe=M1`);assert.equal(proxy.headers.get('x-chart-source'),'binance');assert.equal(proxy.headers.get('x-chart-instrument'),'PAXGUSDT');
  const proxyPrice=await(await fetch(`${base}/api/chart/price?symbol=XAUUSD&source=binance`)).json();assert.deepEqual([proxyPrice.last,proxyPrice.bid,proxyPrice.ask,proxyPrice.is_demo],[10.15,10.1,10.2,false]);
  const demo=await fetch(`${base}/api/chart/candles?symbol=BTCUSD&timeframe=M5`,{headers:h});assert.equal(demo.headers.get('x-chart-source'),'demo');assert.equal((await demo.json()).length,500);
  const p=await(await fetch(`${base}/api/chart/price?symbol=EURUSD&source=demo`)).json();assert.equal(p.is_demo,true);assert.equal(p.bid,null);assert.equal(p.ask,null);
  const unavailable=await fetch(`${base}/api/chart/candles?symbol=BTCUSD&timeframe=M1&source=twelvedata`,{headers:h});assert.equal(unavailable.status,502);assert.doesNotMatch(await unavailable.text(),/secret|test-provider-key/);
  const trades=Array.from({length:40},(_,i)=>({id:i,symbol:'GOLD XAU/USD',dir:'buy',date:'2025-01-01',entry:2500,outcome:'win'}));
  const uploaded=await fetch(`${base}/api/journal/upload`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trades:JSON.stringify(trades)})});assert.equal(uploaded.status,200);assert.match(uploaded.headers.get('cache-control'),/no-store/);const result=await uploaded.json();assert.equal(result.count,40);assert.deepEqual(result.trades,trades);
  assert.equal((await fetch(`${base}/api/journal/upload`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"trades":[null]}'})).status,400);
  assert.equal((await fetch(`${base}/api/journal/upload`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify([{notes:'a'.repeat(5000001)}])})).status,413);
});
