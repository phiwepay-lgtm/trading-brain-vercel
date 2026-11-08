const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pine = fs.readFileSync(path.join(__dirname, '../public/ea/TradingBrain_M5_Part1.pine'), 'utf8');

// Independent reference for state/anchor arithmetic only; this does not execute Pine.
function evaluate(state, x) {
  if (!x.enabled || !x.newM5) return state;
  const hasHigh = x.highPivotIndex != null && x.swingHigh != null && x.m5Index - x.highPivotIndex <= x.lookback;
  const hasLow = x.lowPivotIndex != null && x.swingLow != null && x.m5Index - x.lowPivotIndex <= x.lookback;
  const bull = hasHigh && x.close > x.swingHigh && x.highPivotIndex !== state.usedHigh;
  const bear = hasLow && x.close < x.swingLow && x.lowPivotIndex !== state.usedLow;
  if (!bull && !bear) return state;
  const direction = bull && bear ? 'AMBIGUOUS' : bull ? 'BULL' : 'BEAR';
  const fibLow = hasLow ? x.swingLow : null, fibHigh = x.high;
  const valid = fibLow != null && fibHigh > fibLow && direction !== 'AMBIGUOUS';
  return { usedHigh: bull ? x.highPivotIndex : state.usedHigh, usedLow: bear ? x.lowPivotIndex : state.usedLow,
    direction, bosHigh: x.high, bosLow: fibLow, fibLow, fibHigh,
    level: valid ? fibHigh - (fibHigh - fibLow) * 0.382 : null,
    status: valid ? 'WAITING_0382' : 'WAITING_ANCHORS' };
}
const event = {enabled:true,newM5:true,lookback:50,m5Index:100,highPivotIndex:90,lowPivotIndex:88,swingHigh:110,swingLow:100,high:115,close:112};

test('Part 1 draft is inert and clearly distinguishes provisional settings', () => {
  assert.match(pine, /indicator\(/);
  assert.match(pine, /Enable_Background = input\.bool\(false/);
  assert.match(pine, /Sessions_Confirmed = input\.bool\(false/);
  assert.match(pine, /input\.session\("0930-1600"/);
  assert.match(pine, /input\.session\("0100-0600"/);
  assert.match(pine, /isGolden = Enable_Background and Sessions_Confirmed and \(isNQ or isAsian\)/);
  assert.doesNotMatch(pine, /var bool isGolden/);
  assert.doesNotMatch(pine, /\bstrategy\.(entry|order|exit)\s*\(|\balert\s*\(/);
  assert.match(pine, /No touch\/confirmation transition is assumed/);
  assert.match(pine, /bearish fib anchor\/direction still need user confirmation/);
});

test('M5 confirmed pivots and completed-bar breakout are separated from 0.382', () => {
  assert.match(pine, /ta\.pivothigh\(high, Pivot_Left, Pivot_Right\)/);
  assert.match(pine, /ta\.pivotlow\(low, Pivot_Left, Pivot_Right\)/);
  assert.match(pine, /request\.security\(syminfo\.tickerid, "5", f_completedM5\(\), lookahead=barmerge\.lookahead_on\)/);
  assert.match(pine, /\[time\[1\], bar_index\[1\], high\[1\], low\[1\], close\[1\], swingHigh\[1\], swingLow\[1\], highPivotIndex\[1\], lowPivotIndex\[1\]\]/);
  assert.match(pine, /m5Close > lastSwingHigh/);
  assert.match(pine, /m5Close < lastSwingLow/);
  assert.doesNotMatch(pine, /ta\.highest\(high\[1\],\s*5\)/);
  const s = evaluate({usedHigh:null,usedLow:null}, event);
  assert.equal(s.status,'WAITING_0382');
  assert.equal(s.direction,'BULL');
  assert.equal(s.bosHigh,115);
  assert.equal(s.bosLow,100);
  assert.equal(s.level, 115 - 15 * 0.382);
  assert.strictEqual(evaluate(s,event),s, 'same pivot must not repeatedly reset state');
});

test('provisional references handle stale or missing pivots, strict breaks and bearish ambiguity', () => {
  const initial = {usedHigh:null,usedLow:null};
  assert.strictEqual(evaluate(initial,{...event, enabled:false}),initial);
  assert.strictEqual(evaluate(initial,{...event, newM5:false}),initial);
  assert.strictEqual(evaluate(initial,{...event, close:110}),initial, 'equality is not a breakout');
  assert.strictEqual(evaluate(initial,{...event, highPivotIndex:49}),initial, 'old high cannot trigger BOS');
  const missing = evaluate(initial,{...event, lowPivotIndex:null, swingLow:null});
  assert.equal(missing.status,'WAITING_ANCHORS');
  assert.equal(missing.level,null);
  const bear = evaluate(initial,{...event, high:105, close:99});
  assert.equal(bear.direction,'BEAR');
  assert.equal(bear.status,'WAITING_0382');
  assert.equal(bear.level,105 - 5 * 0.382);
  assert.equal(evaluate(initial,{...event, high:99, close:98}).status,'WAITING_ANCHORS');
});
