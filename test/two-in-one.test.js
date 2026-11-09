const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const pine = readFileSync('public/ea/Dark_Orders_Trend_Predictor.pine', 'utf8');
const indie = readFileSync('public/ea/Dark_Orders_Trend_Predictor.indie.txt', 'utf8');

test('Pine combination keeps the existing independent calculations and recap', () => {
  const dark = readFileSync('public/ea/Dark_Orders_Pure_Price.pine', 'utf8');
  const anchor = readFileSync('public/ea/Trend_Predictor.pine', 'utf8');
  assert.match(pine, /^\/\/@version=6\n/);
  assert.equal((pine.match(/^indicator\(/gm) || []).length, 1);
  assert.ok(pine.includes(dark.slice(dark.indexOf('// Price-only'))));
  assert.ok(pine.includes(anchor.slice(anchor.indexOf('gA = "Anchor"'))));
  assert.ok(pine.includes('https://creativecommons.org/licenses/by-nc-sa/4.0/'));
  assert.ok(pine.includes('neither is a filter for the other'));
  assert.doesNotMatch(pine, /calc_bars_count=2500/);
});

test('Indie draft discloses differences and keeps dark logic separate from the anchor', () => {
  assert.match(indie, /^# indie:lang_version = 5\n/);
  for (const text of ['CC BY-NC-SA 4.0', 'omits the Dark Orders history table and alert conditions', 'unusual and ha_expanding', 'ha_open[1] + ha_close[1]', "Vwap.new(self.hlc3, 'Session', 1.0)", 'Ema.new(weighted_close, anchor_len)', 'self.is_closed_bar', 'show_anchor and self.is_closed_bar']) assert.ok(indie.includes(text), `Missing ${text}`);
  assert.doesNotMatch(indie, /dark_bull\s*=.*\bblend\b|dark_bear\s*=.*\bblend\b/);
});
