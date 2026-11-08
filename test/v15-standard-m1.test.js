const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pine = fs.readFileSync(path.join(__dirname, '../reference/legacy-ea/TradingBrain_M5_M1_v15.pine'), 'utf8');

test('v15 keeps M5 HA and standard-M1 visual-break confirmation', () => {
  assert.match(pine, /isM1 = timeframe\.isminutes and timeframe\.multiplier == 1/);
  assert.match(pine, /isStandard = chart\.is_standard/);
  assert.match(pine, /isGoldenSession = Enable_Simulation and isM1 and isStandard and inSession/);
  assert.match(pine, /haTicker = ticker\.heikinashi\(syminfo\.tickerid\)/);
  assert.match(pine, /request\.security\(haTicker, "5", f_completedHA\(\), lookahead=barmerge\.lookahead_on\)/);
  assert.match(pine, /m1PH = ta\.pivothigh\(high, M1_Left, M1_Right\)/);
  assert.match(pine, /m1PL = ta\.pivotlow\(low, M1_Left, M1_Right\)/);
  assert.match(pine, /if state == "WAITING_CHOCH" and bar_index > reactionBar and direction == 1 and hasLowerHigh and close\[1\] <= lastM1High and close > lastM1High\n\s+bullChoch := true\n\s+chochLevel := lastM1High/);
  assert.match(pine, /else if state == "WAITING_CHOCH" and bar_index > reactionBar and direction == -1 and hasHigherLow and close\[1\] >= lastM1Low and close < lastM1Low\n\s+bearChoch := true\n\s+chochLevel := lastM1Low/);
  assert.doesNotMatch(pine, /request\.security\(haTicker, "1"/);
});

test('v15 keeps standard-M1 engulfing bodies and the existing strict multiplier', () => {
  assert.match(pine, /Engulf_Multiplier = input\.float\(1\.2,/);
  assert.match(pine, /contiguous = not na\(time\[1\]\) and time - time\[1\] == 60000/);
  assert.match(pine, /bullEngulf = contiguous and close\[1\] < open\[1\] and close > open and open <= close\[1\] and close > open\[1\] and \(close - open\) > \(open\[1\] - close\[1\]\) \* Engulf_Multiplier/);
  assert.match(pine, /bearEngulf = contiguous and close\[1\] > open\[1\] and close < open and open >= close\[1\] and close < open\[1\] and \(open - close\) > \(close\[1\] - open\[1\]\) \* Engulf_Multiplier/);
});
