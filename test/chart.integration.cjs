const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { spawn } = require('node:child_process');
const path = require('node:path');
async function freePort() { const s = net.createServer(); await new Promise(r => s.listen(0,'127.0.0.1',r)); const port = s.address().port; await new Promise(r => s.close(r)); return port; }
test('chart REST routes validate access, translate real provider shapes and handle provider errors', { timeout: 30000 }, async t => {
  const port = await freePort();
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', String(port), '-H', '127.0.0.1'], {env:{...process.env, TWELVE_DATA_API_KEY:'test-provider-key', CHART_ACCESS_TOKEN:'test-chart-token-with-24-chars', NODE_OPTIONS:`--require ${path.join(__dirname,'mock-chart-provider.cjs')}`}, stdio:'ignore'});
  t.after(() => server.kill('SIGTERM')); const base = `http://127.0.0.1:${port}`;
  let ready = false; for (let i=0;i<100&&!ready;i++) { try { ready=(await fetch(`${base}/api/status`)).ok; } catch { await new Promise(r=>setTimeout(r,100)); } } assert.ok(ready,'Run npm run build first');
  const h = {Authorization:'Bearer test-chart-token-with-24-chars'};
  assert.equal((await fetch(`${base}/api/chart/candles?symbol=XAUUSD&timeframe=M1`)).status,401);
  assert.equal((await fetch(`${base}/api/chart/candles?symbol=XAUUSD&timeframe=M5&before=garbage`,{headers:h})).status,400);
  const response = await fetch(`${base}/api/chart/candles?symbol=XAUUSD&timeframe=M1`,{headers:h}); assert.equal(response.status,200); assert.match(response.headers.get('cache-control'),/no-store/);
  assert.deepEqual(await response.json(),[{time:1735819200,open:9,high:12,low:8,close:10,volume:7},{time:1735819260,open:10,high:13,low:9,close:12,volume:null}]);
  const quote = await (await fetch(`${base}/api/chart/price?symbol=EURUSD`,{headers:h})).json(); assert.equal(quote.last,123.45); assert.equal(quote.bid,null); assert.equal(quote.ask,null);
  const bad = await fetch(`${base}/api/chart/candles?symbol=BTCUSD&timeframe=M1`,{headers:h}); assert.equal(bad.status,502); assert.doesNotMatch(await bad.text(),/secret|test-provider-key/);
});
