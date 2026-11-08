const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pine = fs.readFileSync(path.join(__dirname, '../public/ea/TradingBrain_M5_M1_v15.pine'), 'utf8');

test('v15 debug defaults and pivot-age thresholds are explicit', () => {
  assert.match(pine, /M5_Lookback = input\.int\(200,/);
  assert.match(pine, /Debug_M5 = input\.bool\(true, "Show M5 HA debug"\)/);
  assert.match(pine, /Fib_Tolerance_Ticks = input\.int\(30,/);
  assert.match(pine, /haIndex - haHighIndex <= M5_Lookback \* 2/);
  assert.match(pine, /haIndex - haLowIndex <= M5_Lookback \* 2/);
  assert.match(pine, /haIndex - haPrevHighIndex <= M5_Lookback\n/);
  assert.match(pine, /haIndex - expectedHighIndex <= M5_Lookback/);
  assert.match(pine, /plot\(Debug_M5 and isM1 and isStandard \? expectedHigh : na/);
  assert.match(pine, /plot\(Debug_M5 and isM1 and isStandard \? expectedLow : na/);
  assert.match(pine, /plot\(Debug_M5 and expectingBullBOS \? 1 : na, title="Expecting Bull BOS count", display=display\.data_window\)/);
  assert.match(pine, /plot\(Debug_M5 and expectingBearBOS \? 1 : na, title="Expecting Bear BOS count", display=display\.data_window\)/);
  assert.match(pine, /table\.new\(position\.top_right, 2, 6,/);
  assert.match(pine, /Debug_M5 \? "M5 Pivots Today"/);
  assert.match(pine, /Debug_M5 \? str\.tostring\(isNewHighPivot or isNewLowPivot\)/);
});

test('sensitivity does not turn off session or alter BT/FTB path requirements', () => {
  assert.match(pine, /Enable_Simulation = input\.bool\(false/);
  assert.match(pine, /isGoldenSession = Enable_Simulation and Sessions_Confirmed and isM1 and isStandard and \(isNQ or isAsian\)/);
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


test('any newly observed pivot creates the requested one-bar FTB expectation', () => {
  assert.match(pine, /isNewHighPivot = not na\(expectedHigh\) and not na\(expectedHighIndex\) and \(na\(expectedHighIndex\[1\]\) or expectedHighIndex != expectedHighIndex\[1\]\)/);
  assert.match(pine, /isNewLowPivot = not na\(expectedLow\) and not na\(expectedLowIndex\) and \(na\(expectedLowIndex\[1\]\) or expectedLowIndex != expectedLowIndex\[1\]\)/);
  assert.match(pine, /expectingBullBOS = isNewHighPivot and not na\(haIndex\) and haIndex - expectedHighIndex <= M5_Lookback/);
  assert.match(pine, /expectingBearBOS = isNewLowPivot and not na\(haIndex\) and haIndex - expectedLowIndex <= M5_Lookback/);
  assert.doesNotMatch(pine, /expectedHigh > expectedPrevHigh|expectedLow < expectedPrevLow/);
  assert.match(pine, /failedHigh = isGoldenSession and Use_FTB and newHaM5 and expectingBullBOS and haHigh >= expectedHigh and haClose < expectedHigh and haClose < haOpen/);
  assert.match(pine, /failedLow = isGoldenSession and Use_FTB and newHaM5 and expectingBearBOS and haLow <= expectedLow and haClose > expectedLow and haClose > haOpen/);
  // Independent model of the supplied expression, not execution of Pine.
  const isNew = (price, index, prevIndex) => price != null && index != null && (prevIndex == null || index !== prevIndex);
  assert.equal(isNew(90, 102, 100), true); // lower high still accepted
  assert.equal(isNew(110, 102, 100), true); // higher low still accepted
  assert.equal(isNew(90, 102, 102), false); // no persistent expectation
  assert.equal(isNew(90, 102, null), true); // first observed pivot
  assert.equal(isNew(null, 102, 100), false);
  // Exact level touch is required; a near miss is not an FTB.
  const failedHighTouch = (high, level, close) => high >= level && close < level;
  const failedLowTouch = (low, level, close) => low <= level && close > level;
  assert.equal(failedHighTouch(99.99, 100, 99), false);
  assert.equal(failedHighTouch(100, 100, 99), true);
  assert.equal(failedLowTouch(100.01, 100, 101), false);
  assert.equal(failedLowTouch(100, 100, 101), true);
  assert.equal(failedHighTouch(101, 100, 100), false); // failed close must be strict
});
