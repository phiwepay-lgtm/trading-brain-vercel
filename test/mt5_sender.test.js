const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('mt5 sender: python unit checks pass', () => {
  const out = execFileSync('python3', [path.join('scripts', 'mt5_sender_test.py')], { encoding: 'utf8', cwd: root });
  assert.match(out, /mt5 sender: (\d+) checks passed/);
});
