const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { spawn } = require('node:child_process');
const path = require('node:path');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aGQAAAAASUVORK5CYII=', 'base64');

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('real route validates uploads and safely handles mocked provider output', { timeout: 30000 }, async t => {
  const port = await freePort();
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', String(port), '-H', '127.0.0.1'], {
    env: { ...process.env, OPENAI_API_KEY: 'mock-not-a-real-key', BRAIN_ACCESS_TOKEN: 'unit-test-token-1234567890', NODE_OPTIONS: `--require ${path.join(__dirname, 'mock-vision.cjs')}` },
    stdio: 'ignore',
  });
  t.after(() => server.kill('SIGTERM'));
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    try { ready = (await fetch(`${base}/api/status`)).ok; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(ready, 'Next.js test server did not start; run npm run build first');
  const auth = { Authorization: 'Bearer unit-test-token-1234567890' };
  function form(buffer = png, type = 'image/png') { const value = new FormData(); value.append('image', new Blob([buffer], { type }), 'chart.png'); return value; }
  assert.equal((await fetch(`${base}/api/brain/analyze`, { method: 'POST', body: form() })).status, 401);
  assert.equal((await fetch(`${base}/api/brain/analyze`, { method: 'POST', headers: { Authorization: 'Bearer wrong' }, body: form() })).status, 401);
  assert.equal((await fetch(`${base}/api/brain/analyze`, { method: 'POST', headers: auth, body: form(Buffer.from('invalid')) })).status, 400);
  assert.equal((await fetch(`${base}/api/brain/analyze`, { method: 'POST', headers: auth, body: form(Buffer.alloc(3 * 1024 * 1024 + 1)) })).status, 413);
  const streamed = new ReadableStream({ start(controller) { controller.enqueue(Buffer.alloc(3 * 1024 * 1024 + 65537)); controller.close(); } });
  const chunked = await fetch(`${base}/api/brain/analyze`, { method: 'POST', headers: { ...auth, 'Content-Type': 'multipart/form-data; boundary=testing' }, body: streamed, duplex: 'half' });
  assert.equal(chunked.status, 413);

  const response = await fetch(`${base}/api/brain/analyze`, { method: 'POST', headers: auth, body: form() });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const body = await response.json();
  assert.equal(body.pattern, 'Mock pattern');
  assert.equal(body.verdict, 'SKIP');
  assert.equal(body.confidence, null);
  const status = await (await fetch(`${base}/api/status`)).json();
  assert.equal(status.mt5_connected, false);
  assert.equal(status.scanning, false);
});
