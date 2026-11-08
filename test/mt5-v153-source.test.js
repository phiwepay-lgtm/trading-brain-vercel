const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'reference/legacy-ea/TradingBrain_Tester_v153.mq5'), 'utf8');
const presetDir = path.join(root, 'reference/legacy-ea');

function readPreset(name) {
  const buffer = fs.readFileSync(path.join(presetDir, name));
  assert.equal(buffer[0], 0xff);
  assert.equal(buffer[1], 0xfe);
  return Object.fromEntries(buffer.toString('utf16le').replace(/^\uFEFF/, '').split(/\r?\n/)
    .filter(line => line && !line.startsWith(';')).map(line => line.split('=')));
}

test('v15.3 EA is explicitly tester-only, with separate default-off order gates', () => {
  assert.match(source, /if\(!MQLInfoInteger\(MQL_TESTER\)\) \{ Print\("TB v15\.3: Strategy Tester only; no live or demo operation\."\); return INIT_FAILED; \}/);
  assert.match(source, /input bool Enable_Simulation = false;/);
  assert.match(source, /input bool Enable_StrategyTester_Orders = false;/);
  assert.match(source, /if\(!MQLInfoInteger\(MQL_TESTER\) \|\| !Enable_Simulation \|\| !Enable_StrategyTester_Orders\) return false;/);
  assert.equal((source.match(/trade\.Buy\(/g) || []).length, 1);
  assert.equal((source.match(/trade\.Sell\(/g) || []).length, 1);
  assert.doesNotMatch(source, /\b(?:WebRequest|FileOpen|OrderSend)\s*\(/);
  assert.match(source, /if\(TB_TESTER_VISUALS && MQLInfoInteger\(MQL_TESTER\)\) ObjectsDeleteAll/);
});

test('v15.3 draft retains major M5 HA, FTB and standard-M1 research rules', () => {
  assert.match(source, /BuildHA\(m5,n5,a\)/);
  assert.match(source, /ha\[i\]\.close=\(bars\[i\]\.open\+bars\[i\]\.high\+bars\[i\]\.low\+bars\[i\]\.close\)\/4\.0/);
  assert.match(source, /PivotHA\(a,e-1,M5_Left,M5_Right,0,true\)/);
  assert.match(source, /if\(previousM5Handled>0 && iBarShift\(_Symbol,PERIOD_M5,previousM5Handled,true\)!=2\)/);
  assert.match(source, /skippedM5Events\+\+; haveActiveHigh=false; haveActiveLow=false/);
  assert.match(source, /observedM5-activeHighAt>M5_Lookback \|\| a\[e\]\.close>activeHigh/);
  assert.match(source, /a\[e\]\.high>=activeHigh && a\[e\]\.high<=activeHigh\+tolerance && a\[e\]\.close<activeHigh/);
  assert.match(source, /a\[e\]\.low<=activeLow && a\[e\]\.low>=activeLow-tolerance && a\[e\]\.close>activeLow/);
  assert.match(source, /m1\[k-1\]\.close<=h\.value && m1\[k\]\.close>h\.value/);
  assert.match(source, /m1\[k-1\]\.close>=l\.value && m1\[k\]\.close<l\.value/);
  assert.match(source, /setupType=="FTB" \|\| \(setupType=="BT" && fib>0/);
  assert.match(source, /bullBos=FreshLatest\(hi,e\) && a\[e\]\.close>hi\.value/);
  assert.match(source, /bearBos=FreshLatest\(lo,e\) && a\[e\]\.close<lo\.value/);
  assert.match(source, /bLow=FreshLatest\(lo,e\)\?lo\.value:0; bHigh=a\[e\]\.high/);
  assert.match(source, /bLow=a\[e\]\.low; bHigh=FreshLatest\(hi,e\)\?hi\.value:0/);
  assert.match(source, /fib=direction==1\?bHigh-\(bHigh-bLow\)\*0\.382:bLow\+\(bHigh-bLow\)\*0\.382/);
  assert.doesNotMatch(source, /bearStructure/);
  assert.match(source, /if\(Bypass_Session\) return true;/);
  assert.match(source, /input int HA_History_Bars = 5000;/);
  assert.match(source, /skipped M5 update events=/);
});

test('all presets match the draft inputs and are inert until deliberately enabled', () => {
  const inputs = [...source.matchAll(/^input\s+\w+\s+(\w+)\s*=/gm)].map(m => m[1]).sort();
  for (const [name, mode, ftb, rr] of [['Both','0','true','2.5'], ['FTB_Only','1','true','2.5'], ['BT_Only','2','false','2.5'], ['BT_RR2','2','false','2.0'], ['BT_RR5','2','false','5.0'], ['BT_RR7','2','false','7.0']]) {
    const preset = readPreset(`TradingBrain_v153_${name}.set`);
    assert.deepEqual(Object.keys(preset).sort(), inputs);
    assert.equal(preset.Enable_Simulation, 'false');
    assert.equal(preset.Enable_StrategyTester_Orders, 'false');
    assert.equal(preset.Bypass_Session, 'true');
    assert.equal(preset.Test_Mode, mode);
    assert.equal(preset.Use_FTB, ftb);
    assert.equal(preset.RR_Ratio, rr);
    assert.equal(preset.M5_Lookback, '200');
    assert.equal(preset.FTB_Touch_Bound_Ticks, '30');
  }
});

test('Download Center no longer exposes the archived tester kit', () => {
  const page = fs.readFileSync(path.join(root, 'app/ea/download-center.tsx'), 'utf8');
  assert.doesNotMatch(page, /TradingBrain-MT5-v153-Tester\.zip/);
  assert.match(page, /TradingBrain_Pro_V1_Tester\.mq5/);
});
