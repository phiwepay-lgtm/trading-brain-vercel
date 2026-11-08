const test = require('node:test');
const assert = require('node:assert/strict');

// Independent arithmetic examples only. These do not execute or compile MQL5.
test('mirrored BT breakout and 0.382 levels use opposite directions', () => {
  const high = 110, low = 100, ratio = 0.382;
  const bullFib = high - (high - low) * ratio;
  const bearFib = low + (high - low) * ratio;
  assert.ok(Math.abs(bullFib - 106.18) < 1e-9);
  assert.ok(Math.abs(bearFib - 103.82) < 1e-9);
  assert.equal(111 > high, true);
  assert.equal(110 > high, false); // close at high is not a break
  assert.equal(99 < low, true);
  assert.equal(100 < low, false); // close at low is not a break
});

test('target presets use signal-close-to-stop distance in both directions', () => {
  function target(buy, signalClose, stop, rr) {
    const risk = buy ? signalClose - stop : stop - signalClose;
    return buy ? signalClose + risk * rr : signalClose - risk * rr;
  }
  for (const rr of [2, 5, 7]) {
    assert.equal(target(true, 101, 100, rr), 101 + rr);
    assert.equal(target(false, 99, 100, rr), 99 - rr);
  }
  assert.equal(12 > 10 * 1.2, false); // exact 1.2x is not greater
  assert.equal(13 > 10 * 1.2, true);
});
