const test = require('node:test');
const assert = require('node:assert/strict');
const brain = require('../data/brain.json');
const summary = require('../data/journal_summary.json');

test('brain contains the user-specified system and offline flags', () => {
  assert.equal(brain.system_name, 'M5 BOS -> 0.382 -> M1 VLB + Engulf');
  assert.equal(brain.htf, 'M5 BOS required');
  assert.equal(brain.entry_zone, '0.382 fib retrace');
  assert.deepEqual(brain.ltf_confirm, ['M1 Valid Liquidity Build', 'Engulfing']);
  assert.equal(brain.risk, '0.5-1% , SL beyond VLB');
  assert.equal(brain.mt5_connected, false);
  assert.equal(brain.scanning, false);
});

test('summary contains no invented statistics, or a consistent verified sample', () => {
  if (summary.status === 'awaiting_verified_data') {
    for (const field of ['total_valid', 'wins', 'losses', 'breakeven', 'win_rate']) assert.equal(summary[field], null);
  } else {
    assert.equal(summary.status, 'available');
    assert.equal(summary.total_valid, 33);
    assert.equal(summary.total_valid, summary.wins + summary.losses + summary.breakeven);
    const decided = summary.wins + summary.losses;
    if (decided) assert.ok(Math.abs(summary.win_rate - summary.wins / decided * 100) <= 0.051);
    else assert.equal(summary.win_rate, null);
  }
});
