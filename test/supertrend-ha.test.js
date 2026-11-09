const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync, execFileSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const ea = fs.readFileSync('mt5/Supertrend/MQL5/Experts/SupertrendHA_Tester.mq5', 'utf8');
test('MT5 draft is tester-only and trade execution is opt-in and broker priced', () => {
  for (const text of ['EnableTesterOrders=false', '!MQLInfoInteger(MQL_TESTER)', '_Period!=PERIOD_M1', 'CopyRates(_Symbol,PERIOD_M1,1,HistoryBars,bars)', 'HasSymbolExposure()', 'if(!firstRun && (latestBuy || latestSell))', 'tick.ask : tick.bid', 'risk*TP1_R', 'TRADE_RETCODE_DONE', 'NOT a full Pine port']) assert.ok(ea.includes(text), `Missing ${text}`);
  assert.match(ea, /if\(!EnableTesterOrders \|\| !MQLInfoInteger\(MQL_TESTER\)\) return/);
});

test('portable core passes synthetic HA and trend checks', (t) => {
  if (spawnSync('g++', ['--version']).error) return t.skip('g++ unavailable; core harness not run');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-ha-'));
  try {
    const binary = path.join(dir, 'core-test');
    execFileSync('g++', ['-std=c++17', '-Wall', '-Wextra', '-Werror', 'test/stcore-check.cpp', '-o', binary]);
    assert.match(execFileSync(binary, { encoding: 'utf8' }), /checks passed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('source package is synchronized with its checked-in files', () => {
  const py = `import sys,zipfile,pathlib\nz=zipfile.ZipFile(sys.argv[1]); root=pathlib.Path('mt5/Supertrend')\nfiles=['README.txt','MQL5/Experts/SupertrendHA_Tester.mq5','MQL5/Experts/STCore.mqh','MQL5/Scripts/Create_Supertrend_HA_Template.mq5']\nassert sorted(z.namelist())==sorted(files)\nfor f in files: assert z.read(f)==(root/f).read_bytes(), f\n`;
  execFileSync('python3', ['-c', py, 'public/ea/Supertrend_HA_Tester_Research.zip']);
});
