const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pine = fs.readFileSync(path.join(__dirname, '../public/ea/TradingBrain_M5_M1_v15.pine'), 'utf8');

test('strategy wiring uses persistent HA pivots and exact-touch bounded FTB', () => {
  for (const name of ['High', 'Low']) {
    assert.match(pine, new RegExp(`var float activeExpected${name} = na`));
    assert.match(pine, new RegExp(`var int activeExpected${name}Index = na`));
    assert.match(pine, new RegExp(`haIndex - activeExpected${name}Index <= M5_Lookback`));
    assert.match(pine, new RegExp(`activeExpected${name} := na`));
  }
  assert.match(pine, /if newHaM5\n\s+\/\/ Update even outside trading sessions/);
  assert.match(pine, /haIndex - activeExpectedHighIndex > M5_Lookback or haClose > activeExpectedHigh/);
  assert.match(pine, /haIndex - activeExpectedLowIndex > M5_Lookback or haClose < activeExpectedLow/);
  assert.match(pine, /expectedHighIndex > activeExpectedLowIndex/);
  assert.match(pine, /expectedLowIndex > activeExpectedHighIndex/);
  assert.match(pine, /ftbTolerance = 30 \* syminfo\.mintick/);
  assert.match(pine, /haHigh >= activeExpectedHigh - ftbTolerance and haHigh <= activeExpectedHigh \+ ftbTolerance and haHigh >= activeExpectedHigh and haClose < activeExpectedHigh and haClose < haOpen/);
  assert.match(pine, /haLow <= activeExpectedLow \+ ftbTolerance and haLow >= activeExpectedLow - ftbTolerance and haLow <= activeExpectedLow and haClose > activeExpectedLow and haClose > haOpen/);
  assert.match(pine, /ftbLevel := setupType == "FTB" \? \(failedHigh \? activeExpectedHigh : activeExpectedLow\) : na/);
  assert.doesNotMatch(pine, /usedFtbHighPivot|usedFtbLowPivot|FTB_Proximity_Ticks|FTB_Tolerance_Ticks/);
});

// Independent reference model of the intended M5 updates. It does not run or compile Pine.
function update(s, {idx, close, highPivot, lowPivot, lookback=200}) {
  if (highPivot && (!s.low || highPivot.idx >= s.low.idx)) {
    s.high = highPivot;
    if (s.low && highPivot.idx > s.low.idx) s.low = null;
  }
  if (lowPivot && (!s.high || lowPivot.idx >= s.high.idx)) {
    s.low = lowPivot;
    if (s.high && lowPivot.idx > s.high.idx) s.high = null;
  }
  if (s.high && (idx-s.high.idx > lookback || close > s.high.price)) s.high = null;
  if (s.low && (idx-s.low.idx > lookback || close < s.low.price)) s.low = null;
  return s;
}
function ftbHigh(s, high, close, open, priorOpen, priorClose, tick=1) {
  if (!s.high) return false;
  const level=s.high.price, tol=30*tick;
  return high >= level-tol && high <= level+tol && high >= level && close < level && close < open && priorClose > priorOpen;
}
function ftbLow(s, low, close, open, priorOpen, priorClose, tick=1) {
  if (!s.low) return false;
  const level=s.low.price, tol=30*tick;
  return low <= level+tol && low >= level-tol && low <= level && close > level && close > open && priorClose < priorOpen;
}

test('high pivot persists through repeated later failures until BOS or expiry', () => {
  const s = {high:null, low:null};
  update(s, {idx:12, close:90, highPivot:{idx:10, price:100}});
  assert.equal(ftbHigh(s, 90, 90, 95, 80, 90), false); // 10 ticks short
  assert.equal(ftbHigh(s, 100, 90, 95, 80, 90), true); // exact touch
  assert.equal(ftbHigh(s, 130, 90, 95, 80, 90), true); // 30 ticks through
  assert.equal(ftbHigh(s, 131, 90, 95, 80, 90), false); // beyond tolerance
  assert.equal(ftbHigh(s, 100, 90, 95, 90, 80), false); // no prior bullish colour
  update(s, {idx:13, close:90});
  assert.equal(ftbHigh(s, 100, 90, 95, 80, 90), true); // same pivot, later attempt
  update(s, {idx:210, close:90});
  assert.ok(s.high); // age exactly 200
  update(s, {idx:211, close:90});
  assert.equal(s.high, null);
  update(s, {idx:212, close:90, highPivot:{idx:211, price:100}});
  update(s, {idx:213, close:100});
  assert.ok(s.high); // equality is not a close beyond
  update(s, {idx:214, close:101});
  assert.equal(s.high, null); // successful break, including outside session
});

test('low FTB mirrors touch and expiry; newer opposite pivots replace, ties coexist', () => {
  const s = {high:null, low:null};
  update(s, {idx:22, close:110, lowPivot:{idx:20, price:100}});
  assert.equal(ftbLow(s, 110, 110, 105, 110, 100), false); // 10 ticks short
  assert.equal(ftbLow(s, 100, 110, 105, 110, 100), true);
  assert.equal(ftbLow(s, 70, 110, 105, 110, 100), true);
  assert.equal(ftbLow(s, 69, 110, 105, 110, 100), false);
  update(s, {idx:23, close:110});
  assert.equal(ftbLow(s, 100, 110, 105, 110, 100), true);
  update(s, {idx:24, close:100});
  assert.ok(s.low);
  update(s, {idx:25, close:99});
  assert.equal(s.low, null);
  update(s, {idx:32, close:105, lowPivot:{idx:30, price:100}});
  update(s, {idx:33, close:105, highPivot:{idx:31, price:110}});
  assert.equal(s.low, null);
  assert.equal(s.high.idx, 31);
  update(s, {idx:34, close:105, lowPivot:{idx:32, price:100}});
  assert.equal(s.high, null);
  assert.equal(s.low.idx, 32);
  update(s, {idx:40, close:105, highPivot:{idx:38, price:110}, lowPivot:{idx:38, price:100}});
  assert.equal(s.high.idx, 38);
  assert.equal(s.low.idx, 38);
});
