// Static regression checks only. Pine and MQL platform execution is not available here.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createHash} = require('node:crypto');
const read = p => readFileSync(`public/ea/${p}`, 'utf8');
const hash = s => createHash('sha256').update(s.trim()).digest('hex');
const strategy = read('TradingBrain_M5_M1_v153_Mirrored.pine');
const indicator = read('TradingBrain_Indicator_v153_Mirrored.pine');
const ea = read('TradingBrain_Tester_v153.mq5');

test('reporting does not modify Pine signal-state and order rules', () => {
  for (const [source, expected] of [
    [strategy, 'd8165973bfe7a4dba6b9a8d86eea18d5a4a174fe6acfe51d836b6b4209d6a97e'],
    [indicator, '82d119abb54a5b6ee0d8bb3e4df56bdaf26a02e7cdda10d7827196d4c1841262'],
  ]) {
    const rules = source.slice(source.indexOf('bullBos ='), source.indexOf('\n// Confirmations are signals'));
    assert.equal(hash(rules), expected);
    assert.match(source, /barstate\.isconfirmed and \(buyEntry or sellEntry\)/);
    assert.match(source, /"Entry signals"/);
    assert.match(source, /table\.new\(position\.top_right, 2, 12/);
  }
});

test('strategy reports broker-emulator totals and bar exit markers separately from confirmations', () => {
  assert.match(strategy, /strategy\.closedtrades\.exit_bar_index\(strategy\.closedtrades - 1\) == bar_index/);
  assert.match(strategy, /plotshape\(exitOnThisBar/);
  assert.match(strategy, /str\.tostring\(strategy\.closedtrades\)/);
  assert.match(strategy, /str\.tostring\(strategy\.opentrades\)/);
  assert.match(strategy, /LOADED BARS ONLY/);
});

test('indicator identifies double touches as unknown, without changing virtual close rules', () => {
  assert.match(indicator, /virtualAmbiguousExit := stopTouched and targetTouched/);
  assert.match(indicator, /virtualStopExit := stopTouched and not targetTouched/);
  assert.match(indicator, /virtualTargetExit := targetTouched and not stopTouched/);
  assert.match(indicator, /virtualExitLevel := virtualStopExit \? virtualStop : virtualTargetExit \? virtualTarget : na/);
  assert.match(indicator, /plotshape\(virtualAmbiguousExit/);
  assert.match(indicator, /virtualClosedCount \+= 1/);
  assert.match(indicator, /virtualPosition := 0\n        virtualClosedBar := bar_index\n        virtualStop := na\n        virtualTarget := na/);
  assert.doesNotMatch(indicator, /strategy\.(entry|exit|order)/);
});

test('MT5 reports position IDs and deals separately while preserving detection and tester gate', () => {
  let rules = ea.slice(ea.indexOf('void ProcessClosedM1()'), ea.indexOf('\nint OnInit()'));
  rules = rules.replace('         DrawMarker(direction==1?"BUY SIGNAL":"SELL SIGNAL",t,m1[k].close,direction==1?clrLime:clrRed,direction==1);\n', '')
    .replace('            acceptedOrders++;\n', '            acceptedOrders++; DrawMarker(direction==1?"BUY":"SELL",t,m1[k].close,direction==1?clrLime:clrRed,direction==1);\n');
  assert.equal(hash(rules), 'ea8ae2e4d8ca10a2aa1cbb277168a50df20814e2cca729b1788373755801dbd5');
  assert.match(ea, /OnTradeTransaction\(/);
  assert.match(ea, /HistorySelectByPosition\(positionId\)/);
  assert.match(ea, /DEAL_ENTRY_INOUT \|\| entry==DEAL_ENTRY_OUT_BY/);
  assert.match(ea, /exited>=opened-1e-8/);
  assert.match(ea, /!reportedPositions\[index\]\.closed/);
  assert.match(ea, /Position counts unavailable: check tester report/);
  assert.match(ea, /if\(!MQLInfoInteger\(MQL_TESTER\) \|\| !Enable_Simulation \|\| !Enable_StrategyTester_Orders\) return false/);
  assert.doesNotMatch(ea, /\b(?:WebRequest|FileOpen|OrderSend)\s*\(/);
});
