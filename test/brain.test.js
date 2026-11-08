const test = require('node:test');
const assert = require('node:assert/strict');
const brain = require('../data/brain.json');
const summary = require('../data/journal_summary.json');

test('brain contains the user-specified system and offline flags', () => {
  assert.match(brain.system_name, /VLB sell \/ VHB buy/);
  assert.match(brain.htf, /M5 structure confirmation/);
  assert.equal(brain.entry_zone, '0.382 fib retrace');
  assert.match(brain.ltf_confirm.join(' '), /Visual Low Break for sells/);
  assert.match(brain.ltf_confirm.join(' '), /Visual High Break for buys/);
  assert.match(brain.ltf_confirm.join(' '), /Entry on the engulfing candle/);
  assert.doesNotMatch(JSON.stringify(brain), /Valid Liquidity Build/);
  assert.match(brain.risk, /distance not specified/);
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
