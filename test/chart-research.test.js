const {test} = require('node:test');
const assert = require('node:assert/strict');
const indicators = import('../lib/indicators/pivots.mjs');
const trackerModule = import('../lib/indicators/activeLevels.mjs');
const math = import('../lib/chart-math.mjs');
const bar = (time, open, high, low, close) => ({time,open,high,low,close,volume:42});

test('HA first four candles use the seeded recursive MQL formula and preserve time and volume', async () => {
  const {heikinAshi} = await math;
  const data = [bar(0,10,14,8,12),bar(300,12,18,10,16),bar(600,16,20,14,18),bar(900,18,24,16,22)];
  assert.deepEqual(heikinAshi(data), [bar(0,11,14,8,11),bar(300,11,18,10,14),bar(600,12.5,20,12.5,17),bar(900,14.75,24,14.75,20)]);
  assert.equal(data[0].open,10);
});

test('pivot rank, confirmation and asymmetric equal-high/low ties', async () => {
  const {findPivot, confirmedPivots} = await indicators;
  const highs = [1,4,4,1,5,1,6];
  const bars = highs.map((high,i)=>bar(i*60,0,high,-high,0));
  assert.equal(findPivot(bars,6,1,1,0,true).index,4); // last candle cannot be confirmed
  assert.equal(findPivot(bars,6,1,1,1,true).index,1); // equal on right allowed; equal on left not
  assert.equal(findPivot(bars,6,1,1,2,true).valid,false);
  assert.equal(findPivot(bars,6,1,1,0,false).index,4);
  assert.deepEqual(confirmedPivots(bars,6,1,1,true).map(p=>[p.index,p.confirmedAt]),[[1,120],[4,300]]);
  assert.equal(findPivot(bars,1,1,1).valid,false);
  assert.throws(()=>findPivot(bars,7),RangeError);
});

test('independent levels persist, replace, expire, break and invalidate on skipped updates', async () => {
  const {ActiveLevelTracker} = await trackerModule;
  const highs = [3,5,4,4,6,5,5,5,5,5], lows = [1,2,0,1,2,1,1,1,1,1];
  const bars = highs.map((h,i)=>bar(i*300,3,h,lows[i],3));
  const t = new ActiveLevelTracker({left:1,right:1,lookback:10});
  for(let e=0;e<=3;e++) t.update(bars,e);
  assert.equal(t.snapshot().high.value,5); assert.equal(t.snapshot().low,null);
  t.update(bars,4); assert.equal(t.snapshot().low.value,0); assert.equal(t.snapshot().high.value,5);
  t.update(bars,5); assert.equal(t.snapshot().high.value,5);
  t.update(bars,6); assert.equal(t.snapshot().high.value,6); assert.equal(t.snapshot().low.value,0);
  assert.equal(t.update(bars,6).observed,7);
  t.update(bars,8); assert.equal(t.snapshot().skipped,1); assert.equal(t.snapshot().high,null); assert.equal(t.snapshot().low,null);
  const expiry = new ActiveLevelTracker({left:1,right:1,lookback:1});
  const quiet = [bar(0,2,3,1,2),bar(300,2,5,1,2),bar(600,2,4,1,2),...Array.from({length:4},(_,i)=>bar(900+i*300,2,4,1,2))];
  for(let e=0;e<=3;e++) expiry.update(quiet,e);
  assert.equal(expiry.snapshot().high.value,5);
  expiry.update(quiet,4); assert.equal(expiry.snapshot().high.value,5);
  expiry.update(quiet,5); assert.equal(expiry.snapshot().high,null);
  const broken = new ActiveLevelTracker({left:1,right:1,lookback:10});
  const breakout = quiet.map(x=>({...x})); breakout[4].close=6; breakout[4].high=6;
  for(let e=0;e<=4;e++) broken.update(breakout,e);
  assert.equal(broken.snapshot().high,null);
});
