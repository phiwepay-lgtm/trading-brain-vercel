const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../reference/legacy-ea/TradingBrain_M5_M1_v14.pine'), 'utf8');

// Independent state-machine reference, not Pine execution or a backtest.
function step(s, x) {
  if (!x.golden) return {state:'NO_SESSION'};
  if (x.bos) {
    if (x.low == null || x.high == null || x.high <= x.low) return {state:'WAITING_ANCHORS'};
    const level = x.bos === 1 ? x.high - (x.high-x.low)*0.382 : x.low + (x.high-x.low)*0.382;
    return {state:'BOS_FOUND',direction:x.bos,bosBar:x.bar,level};
  }
  if (s.state === 'BOS_FOUND' && x.bar > s.bosBar) s = {...s,state:'WAITING_0382'};
  if (s.state === 'WAITING_0382' && x.bar > s.bosBar && x.barLow <= s.level && x.barHigh >= s.level)
    return {...s,state:'WAITING_CHOCH',reactionBar:x.bar};
  if (s.state === 'WAITING_CHOCH' && x.bar > s.reactionBar && x.breakDirection === s.direction)
    return {...s,state:'CHOCH_FOUND',chochBar:x.bar};
  if (s.state === 'CHOCH_FOUND' && x.bar > s.chochBar + 1 && x.contiguous && x.nearFib && x.engulfDirection === s.direction)
    return {...s,state:'ENTRY_SIGNAL'};
  return s;
}

test('v14 is opt-in, standard-M1 only, and does not use five-bar extremes', () => {
  assert.match(source, /Enable_Simulation = input\.bool\(false/);
  assert.match(source, /Sessions_Confirmed = input\.bool\(false/);
  assert.match(source, /isStandard = chart\.is_standard/);
  assert.match(source, /isGoldenSession = Enable_Simulation and Sessions_Confirmed and isM1 and isStandard and \(isNQ or isAsian\)/);
  assert.match(source, /process_orders_on_close=true/);
  assert.match(source, /RR_Ratio = input\.float\(2\.5/);
  assert.match(source, /Stop_Buffer_Ticks = input\.int\(10/);
  assert.doesNotMatch(source, /ta\.(highest|lowest)\s*\(/);
  assert.doesNotMatch(source, /\balert\s*\(/);
});

test('v14 uses completed M5 pivots, 0.382 direction and confirmed M1 visual-break approximation', () => {
  assert.match(source, /request\.security\(syminfo\.tickerid, "5", f_completedM5\(\), lookahead=barmerge\.lookahead_on\)/);
  assert.match(source, /\[time\[1\], bar_index\[1\], high\[1\], low\[1\], close\[1\], swingHigh\[1\], swingLow\[1\], prevHigh\[1\], prevLow\[1\]/);
  assert.match(source, /haTicker = ticker\.heikinashi\(syminfo\.tickerid\)/);
  assert.match(source, /request\.security\(haTicker, "5", f_completedM5\(\), lookahead=barmerge\.lookahead_on\)/);
  assert.match(source, /m5Close > m5SwingHigh/);
  assert.match(source, /haClose < haSwingLow/);
  assert.match(source, /haPrevLow > haSwingLow and haSwingHigh < haPrevHigh and haHighIndex > haLowIndex/);
  assert.match(source, /bosLegHigh - legRange \* 0\.382 : newLowerLow \+ \(prevHigherLow - newLowerLow\) \* 0\.382/);
  assert.match(source, /newLowerLow := direction == -1 \? haLow : na/);
  assert.match(source, /Engulf_Multiplier = input\.float\(1\.2/);
  assert.match(source, /Fib_Tolerance_Ticks = input\.int\(10/);
  assert.match(source, /math\.abs\(close - fib0382\) <= Fib_Tolerance_Ticks \* syminfo\.mintick/);
  assert.match(source, /\(open - close\) > \(close\[1\] - open\[1\]\) \* Engulf_Multiplier/);
  assert.match(source, /lastM1High < previousM1High/);
  assert.match(source, /lastM1Low > previousM1Low/);
  assert.match(source, /close\[1\] <= lastM1High and close > lastM1High/);
  assert.match(source, /close\[1\] >= lastM1Low and close < lastM1Low/);
  assert.match(source, /bar_index > chochBar \+ 1/);
  assert.match(source, /time - time\[1\] == 60000/);
  assert.match(source, /open <= close\[1\] and close > open\[1\]/);
  assert.match(source, /open >= close\[1\] and close < open\[1\]/);
  assert.match(source, /low - Stop_Buffer_Ticks \* syminfo\.mintick/);
  assert.match(source, /high \+ Stop_Buffer_Ticks \* syminfo\.mintick/);
});

test('reference enforces ordered bars, session reset and both fib directions', () => {
  let s = step({state:'NO_TRADE'}, {golden:true,bos:1,bar:1,low:100,high:110});
  assert.equal(s.state,'BOS_FOUND'); assert.equal(s.level,110-10*0.382);
  s=step(s,{golden:true,bar:2,barLow:105,barHigh:107});
  assert.equal(s.state,'WAITING_CHOCH');
  s=step(s,{golden:true,bar:2,breakDirection:1});
  assert.equal(s.state,'WAITING_CHOCH', 'same-bar touch and break cannot prove order');
  s=step(s,{golden:true,bar:3,breakDirection:-1}); assert.equal(s.state,'WAITING_CHOCH');
  s=step(s,{golden:true,bar:3,breakDirection:1}); assert.equal(s.state,'CHOCH_FOUND');
  s=step(s,{golden:true,bar:4,contiguous:true,nearFib:true,engulfDirection:1}); assert.equal(s.state,'CHOCH_FOUND');
  s=step(s,{golden:true,bar:5,contiguous:false,nearFib:true,engulfDirection:1}); assert.equal(s.state,'CHOCH_FOUND');
  s=step(s,{golden:true,bar:5,contiguous:true,nearFib:false,engulfDirection:1}); assert.equal(s.state,'CHOCH_FOUND');
  s=step(s,{golden:true,bar:6,contiguous:true,nearFib:true,engulfDirection:1}); assert.equal(s.state,'ENTRY_SIGNAL');
  assert.equal(step(s,{golden:false}).state,'NO_SESSION');
  const bear=step({state:'NO_TRADE'}, {golden:true,bos:-1,bar:8,low:100,high:110});
  assert.equal(bear.level,100+10*0.382);
  assert.equal(step(s,{golden:true,bos:-1,bar:9,low:100,high:99}).state,'WAITING_ANCHORS');
});

test('bearish fib uses BOS lower low and earlier higher pivot, not the broken low', () => {
  const previousHigherLow = 110, brokenLow = 105, bosCandleLow = 100;
  assert.ok(previousHigherLow > brokenLow && brokenLow > bosCandleLow);
  const level = bosCandleLow + (previousHigherLow - bosCandleLow) * 0.382;
  assert.equal(level, 103.82);
  assert.notEqual(level, brokenLow + (previousHigherLow - brokenLow) * 0.382);
  const engulf = (previousBody, currentBody) => currentBody > previousBody * 1.2;
  assert.equal(engulf(10,12), false, 'strictly greater, not equal');
  assert.equal(engulf(10,12.1), true);
  const near = (close, fib, tick) => Math.abs(close-fib) <= 10*tick;
  assert.equal(near(104,103,0.1), true);
  assert.equal(near(104.01,103,0.1), false);
});
