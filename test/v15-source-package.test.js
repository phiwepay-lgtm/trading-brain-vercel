const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '../public/ea', name), 'utf8');

test('v15 indicator retains plotted setup paths without strategy orders and exposes all candidate alerts', () => {
  const pine = read('TradingBrain_Indicator_v15.pine');
  assert.match(pine, /indicator\("TradingBrain v15 - BT\+FTB Indicator", overlay=true\)/);
  assert.doesNotMatch(pine, /\bstrategy\.(entry|exit|order|position_size|closedtrades)\b/);
  for (const name of ['bullBos','bearBos','failedHigh','failedLow','bullChoch','bearChoch','buyEntry','sellEntry'])
    assert.match(pine, new RegExp(`alertcondition\\(${name},`));
  assert.match(pine, /pathReady = setupType == "FTB" or \(setupType == "BT" and nearFib\)/);
  assert.match(pine, /virtualPosition := 0/);
  assert.match(pine, /Enable_Simulation = input\.bool\(false/);
});

test('both MQL drafts prohibit live and demo execution and preserve distinct tester visuals', () => {
  const ea = read('TradingBrain_v15.mq5'), visual = read('TradingBrain_Tester_v15.mq5');
  for (const source of [ea, visual]) {
    assert.match(source, /#include <Trade\/Trade\.mqh>/);
    assert.match(source, /input bool Enable_Simulation = false/);
    assert.match(source, /input bool Enable_StrategyTester_Orders = false/);
    assert.match(source, /if\(!MQLInfoInteger\(MQL_TESTER\) \|\| !Enable_StrategyTester_Orders\) return false/);
    assert.match(source, /setupType=="FTB" \|\| \(setupType=="BT" && fib>0/);
    assert.match(source, /BuildHA\(m5,n5,a\)/);
  }
  assert.match(ea, /#define TB_TESTER_VISUALS false/);
  assert.match(visual, /#define TB_TESTER_VISUALS true/);
  assert.equal(ea.replace('TradingBrain v15 - BT/FTB research draft', 'TradingBrain v15 tester visual draft').replace('#define TB_TESTER_VISUALS false', '#define TB_TESTER_VISUALS true'), visual);
});
