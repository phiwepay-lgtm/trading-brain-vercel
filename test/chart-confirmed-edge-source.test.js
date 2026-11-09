const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const s=readFileSync('reference/retired-ea/TradingBrain_Confirmed_Edge_Research.pine','utf8');

test('combined research indicator keeps both paths and the fib, CHoCH, engulf sequence',()=>{
  assert.match(s,/^\/\/@version=5\r?\nindicator\(/);
  assert.match(s,/options=\["Both", "BT only", "FTB only"\]/);
  assert.match(s,/higherStructure = .*swingHigh > previousHigh and swingLow > previousLow/);
  assert.match(s,/colourFlip = hc > ho and prevHc < prevHo/);
  assert.match(s,/ftbHigh = .*hh >= expectedHigh and hc < expectedHigh/);
  assert.match(s,/ftbLow = .*hl <= expectedLow and hc > expectedLow/);
  assert.match(s,/direction := selectedBtHigh or selectedFtbLow \? 1 : -1/);
  assert.match(s,/state := anchorsValid \? "WAIT_FIB"/);
  assert.match(s,/state == "WAIT_FIB".*low <= fib and high >= fib/);
  assert.match(s,/state == "WAIT_CHOCH".*bullCross : bearCross/);
  assert.match(s,/state == "WAIT_ENGULF".*bullEngulf : bearEngulf/);
  assert.match(s,/open <= close\[1\] and close > open\[1\]/);
  assert.match(s,/open >= close\[1\] and close < open\[1\]/);
  assert.doesNotMatch(s,/strategy\.(entry|exit|order)|ftbTolerance|inSession/);
});

test('draft requires standard M1 and uses completed M5 values',()=>{
  assert.match(s,/timeframe\.multiplier == 1/);
  assert.match(s,/chart\.is_standard/);
  assert.match(s,/hi\[2\].*oldHi\[2\].*lo\[2\].*oldLo\[2\]/);
  assert.match(s,/ht \+ 300000 == time\("5"\)/);
  assert.match(s,/eventCount > 1/);
  assert.match(s,/if missingM1/);
});
