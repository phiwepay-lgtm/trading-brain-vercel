const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pine = fs.readFileSync(path.join(__dirname, '../reference/legacy-ea/TradingBrain_M5_M1_v15.pine'), 'utf8');

test('v15 debug defaults and pivot-age thresholds are explicit', () => {
  assert.match(pine, /M5_Lookback = input\.int\(200,/);
  assert.match(pine, /Debug_M5 = input\.bool\(true, "Show M5 HA debug"\)/);
  assert.match(pine, /Fib_Tolerance_Ticks = input\.int\(30,/);
  assert.match(pine, /haIndex - haHighIndex <= M5_Lookback \* 2/);
  assert.match(pine, /haIndex - haLowIndex <= M5_Lookback \* 2/);
  assert.match(pine, /haIndex - haPrevHighIndex <= M5_Lookback\n/);
  assert.match(pine, /haIndex - activeExpectedHighIndex <= M5_Lookback/);
  assert.match(pine, /plot\(Debug_M5 and isM1 and isStandard \? activeExpectedHigh : na/);
  assert.match(pine, /plot\(Debug_M5 and isM1 and isStandard \? activeExpectedLow : na/);
  assert.match(pine, /plot\(Debug_M5 and expectingBullBOS \? 1 : na, title="Expecting Bull BOS count", display=display\.data_window\)/);
  assert.match(pine, /plot\(Debug_M5 and expectingBearBOS \? 1 : na, title="Expecting Bear BOS count", display=display\.data_window\)/);
  assert.match(pine, /table\.new\(position\.top_right, 2, 7,/);
  assert.match(pine, /Debug_M5 \? "M5 Pivots Today"/);
  assert.match(pine, /Debug_M5 \? str\.tostring\(m5PivotsToday\)/);
});

test('sensitivity does not turn off session or alter BT/FTB path requirements', () => {
  assert.match(pine, /Enable_Simulation = input\.bool\(false/);
  assert.match(pine, /isGoldenSession = Enable_Simulation and isM1 and isStandard and inSession/);
  assert.match(pine, /if state == "WAITING_0382" and bar_index > bosBar and low <= fib0382 and high >= fib0382/);
  assert.match(pine, /pathReady = setupType == "FTB" or \(setupType == "BT" and nearFib\)/);
  assert.match(pine, /request\.security\(haTicker, "5", f_completedHA\(\), lookahead=barmerge\.lookahead_on\)/);
  // Independent boundary examples; this test does not run or compile Pine.
  const lookback = 200;
  assert.equal(400 <= lookback * 2, true);
  assert.equal(401 <= lookback * 2, false);
  assert.equal(201 <= lookback, false); // previous pivot / expectation still uses 200
  const tick=0.01, fib=100;
  assert.equal(Math.abs(100.25-fib) <= 30*tick, true);
  assert.equal(Math.abs(100.31-fib) <= 30*tick, false);
});
