const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pine = fs.readFileSync(path.join(__dirname, '../reference/legacy-ea/TradingBrain_M5_M1_v15.pine'), 'utf8');

test('v15 mode gates entry state, both orders and both bracket exits', () => {
  assert.match(pine, /Test_Mode = input\.string\("Both", "Test Edge Mode", options=\["Both", "FTB Only \(my edge\)", "BT Only \(common\)"\]\)/);
  assert.match(pine, /allowBT = Test_Mode == "Both" or Test_Mode == "BT Only \(common\)"/);
  assert.match(pine, /allowFTB = Test_Mode == "Both" or Test_Mode == "FTB Only \(my edge\)"/);
  assert.match(pine, /edgeAllowed = \(setupType == "BT" and allowBT\) or \(setupType == "FTB" and allowFTB\)/);
  assert.match(pine, /canConfirm = state == "CHOCH_FOUND" and bar_index > chochBar \+ 1 and pathReady and edgeAllowed and \(na\(entryBar\) or entryBar != bar_index\)/);
  assert.match(pine, /if canConfirm and direction == 1 and bullEngulf[\s\S]*?buyEntry := true[\s\S]*?state := "ENTRY_SIGNAL"[\s\S]*?strategy\.entry\("Buy"[\s\S]*?strategy\.exit\("Buy bracket"/);
  assert.match(pine, /else if canConfirm and direction == -1 and bearEngulf[\s\S]*?sellEntry := true[\s\S]*?state := "ENTRY_SIGNAL"[\s\S]*?strategy\.entry\("Sell"[\s\S]*?strategy\.exit\("Sell bracket"/);
  assert.equal((pine.match(/strategy\.entry\(/g) || []).length, 2);
  assert.match(pine, /table\.new\(position\.top_right, 2, 7,/);
  assert.match(pine, /table\.cell\(panel, 0, 5, "Testing Edge", text_color=color\.white, bgcolor=color\.black\)/);
  assert.match(pine, /table\.cell\(panel, 1, 5, Test_Mode, text_color=color\.yellow, bgcolor=color\.black\)/);
  assert.match(pine, /Use_FTB = input\.bool\(true/);
  assert.match(pine, /failedHigh = isGoldenSession and Use_FTB/);
});

test('mode and fib truth table, including unknown setups', () => {
  // Independent reference examples: these do not execute or compile Pine.
  const allowed = (mode, setup, nearFib) => {
    const allowBT = mode === 'Both' || mode === 'BT Only (common)';
    const allowFTB = mode === 'Both' || mode === 'FTB Only (my edge)';
    const edgeAllowed = (setup === 'BT' && allowBT) || (setup === 'FTB' && allowFTB);
    const pathReady = setup === 'FTB' || (setup === 'BT' && nearFib);
    return edgeAllowed && pathReady;
  };
  for (const [mode, bt, ftb] of [
    ['Both', true, true],
    ['FTB Only (my edge)', false, true],
    ['BT Only (common)', true, false],
  ]) {
    assert.equal(allowed(mode, 'BT', true), bt);
    assert.equal(allowed(mode, 'BT', false), false);
    assert.equal(allowed(mode, 'FTB', false), ftb);
    assert.equal(allowed(mode, 'FTB', true), ftb);
    assert.equal(allowed(mode, 'NONE', true), false);
  }
  assert.equal(allowed('Unknown', 'BT', true), false);
  assert.equal(allowed('Unknown', 'FTB', true), false);
});
