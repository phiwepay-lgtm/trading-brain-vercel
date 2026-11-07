const { test } = require('node:test');
const assert = require('node:assert/strict');
const math = import('../lib/chart-math.mjs');
const bar = (time, open, high, low, close) => ({ time, open, high, low, close, volume: null });
test('Heiken Ashi uses prior synthetic open/close and EMA uses SMA-seeded real closes', async () => {
  const { heikinAshi, ema } = await math;
  const data = [bar(60, 10, 14, 8, 12), bar(120, 12, 18, 10, 16), bar(180, 16, 20, 14, 18)];
  const ha = heikinAshi(data);
  assert.deepEqual([ha[0].open, ha[0].close, ha[1].open, ha[1].close], [11, 11, 11, 14]);
  assert.deepEqual(ema(data, 2), [{ time: 120, value: 14 }, { time: 180, value: 18 * 2 / 3 + 14 / 3 }]);
  assert.deepEqual(ema(data, 5), []);
});
test('stream ticks update M1 and aggregate into M5 without inventing volume or accepting old bars', async () => {
  const { applyTick, aggregateMinute, mergeBars } = await math;
  const one = [bar(300, 10, 12, 9, 11)], five = [bar(300, 10, 12, 9, 11)];
  const updated = applyTick(one, { time: 365, last: 15 }, 60);
  assert.deepEqual(updated[1], bar(360, 15, 15, 15, 15));
  const aggregated = aggregateMinute(five, updated[1]);
  assert.deepEqual(aggregated[0], bar(300, 10, 15, 9, 15));
  assert.equal(applyTick(updated, { time: 299, last: 30 }, 60), updated);
  assert.deepEqual(mergeBars([bar(60, 1, 1, 1, 1), bar(300, 2, 2, 2, 2)], one), [bar(60, 1, 1, 1, 1), ...one]);
});
