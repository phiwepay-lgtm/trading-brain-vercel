const { test } = require('node:test');
const assert = require('node:assert/strict');

function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be close to ${expected}`);
}

test('calculateLotSize: risk scales with the account balance', async () => {
  const { calculateLotSize } = await import('../lib/trade.ts');
  const sizing = { riskPercent: 1, pipsAtRisk: 10, pipValuePerLot: 10 };
  closeTo(calculateLotSize({ balance: 10000, ...sizing }), 1);
  closeTo(calculateLotSize({ balance: 20000, ...sizing }), 2);
  closeTo(calculateLotSize({ balance: 5000, ...sizing }), 0.5);
});

test('calculateLotSize: risk scales with the distance at risk', async () => {
  const { calculateLotSize } = await import('../lib/trade.ts');
  closeTo(calculateLotSize({ balance: 10000, riskPercent: 1, pipValuePerLot: 10, pipsAtRisk: 100 }), 0.1);
  closeTo(calculateLotSize({ balance: 10000, riskPercent: 1, pipValuePerLot: 10, pipsAtRisk: 50 }), 0.2);
  closeTo(calculateLotSize({ balance: 10000, riskPercent: 1, pipValuePerLot: 10, pipsAtRisk: 25 }), 0.4);
});

test('calculateLotSize: clamps to maxLot and lotStep', async () => {
  const { calculateLotSize } = await import('../lib/trade.ts');
  closeTo(calculateLotSize({ balance: 10000, riskPercent: 1, pipsAtRisk: 1, pipValuePerLot: 10, maxLot: 0.5 }), 0.5);
  closeTo(calculateLotSize({ balance: 10000, riskPercent: 1, pipsAtRisk: 1000, pipValuePerLot: 10, minLot: 0.3 }), 0.3);
  closeTo(calculateLotSize({ balance: 9970, riskPercent: 1, pipsAtRisk: 10, pipValuePerLot: 10, lotStep: 0.01 }), 0.99);
});

test('calculateLotSize: rejects zero or invalid settings', async () => {
  const { calculateLotSize } = await import('../lib/trade.ts');
  const valid = { riskPercent: 1, pipsAtRisk: 10, pipValuePerLot: 10 };
  assert.throws(() => calculateLotSize({ ...valid, balance: 0 }), RangeError);
  assert.throws(() => calculateLotSize({ ...valid, riskPercent: 101 }), RangeError);
  assert.throws(() => calculateLotSize({ ...valid, pipsAtRisk: 0 }), RangeError);
  assert.throws(() => calculateLotSize({ ...valid, pipValuePerLot: 0 }), RangeError);
  assert.throws(() => calculateLotSize({ balance: 10000, riskPercent: 0.0001, pipsAtRisk: 1, pipValuePerLot: 10, lotStep: 0.01 }), RangeError);
});

test('stopPipsFor: entry and stop convert to pips in either direction', async () => {
  const { stopPipsFor } = await import('../lib/trade.ts');
  closeTo(stopPipsFor(100, 99.5, 'long', 0.0001), 5000);
  closeTo(stopPipsFor(100.50, 100.75, 'short', 0.0001), 2500);
  assert.throws(() => stopPipsFor(100, 100, 'long', 0.0001), RangeError);
  assert.throws(() => stopPipsFor(100, 100.01, 'long', 0.0001), RangeError);
  assert.throws(() => stopPipsFor(100, 99.5, 'short', 0.0001), RangeError);
});

test('pipSizeForDigits: typical symbol decimal places', async () => {
  const { pipSizeForDigits } = await import('../lib/trade.ts');
  closeTo(pipSizeForDigits(5), 0.0001, 1e-12);
  closeTo(pipSizeForDigits(3), 0.01, 1e-12);
  closeTo(pipSizeForDigits(2), 0.1, 1e-12);
});

test('computeTradePlan: EURUSD long alert with 10 pips at risk', async () => {
  const { computeTradePlan } = await import('../lib/trade.ts');
  const plan = computeTradePlan({
    symbol: 'EURUSD',
    direction: 'long',
    entry: 1.09456,
    stop: 1.09356,
    balance: 50000,
    riskPercent: 1,
    pipValuePerLot: 10,
  });
  assert.equal(plan.symbol, 'EURUSD');
  assert.equal(plan.direction, 'long');
  assert.equal(plan.entry, 1.09456);
  assert.equal(plan.stop, 1.09356);
  closeTo(plan.pipsAtRisk, 10);
  closeTo(plan.riskUSD, 500);
  closeTo(plan.lot, 5);
});

test('computeTradePlan: short plan uses the stop above the entry', async () => {
  const { computeTradePlan } = await import('../lib/trade.ts');
  const plan = computeTradePlan({
    symbol: 'USDJPY',
    direction: 'short',
    entry: 150.25,
    stop: 150.50,
    balance: 8000,
    riskPercent: 2,
    pipValuePerLot: 1,
    digits: 3,
  });
  assert.equal(plan.direction, 'short');
  closeTo(plan.pipsAtRisk, 25);
  closeTo(plan.riskUSD, 160);
  closeTo(plan.lot, 6.4);
});

test('computeTradePlan: rejects invalid alerts', async () => {
  const { computeTradePlan } = await import('../lib/trade.ts');
  const base = { symbol: 'EURUSD', direction: 'long', entry: 1.09456, stop: 1.09356, balance: 50000, riskPercent: 1, pipValuePerLot: 10 };
  assert.throws(() => computeTradePlan({ ...base, symbol: '' }), RangeError);
  assert.throws(() => computeTradePlan({ ...base, direction: 'flat' }), RangeError);
  assert.throws(() => computeTradePlan({ ...base, entry: 0 }), RangeError);
  assert.throws(() => computeTradePlan({ ...base, stop: 1.10356 }), RangeError);
});
