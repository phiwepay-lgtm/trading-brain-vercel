const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const all = readFileSync('public/ea/All_In_One.pine', 'utf8');

test('All In One Pine combines every TradingView study into one indicator', () => {
  assert.match(all, /^#?\/\/@version=6\n/);
  assert.equal((all.match(/^indicator\(/gm) || []).length, 1);
  // Dark Orders
  for (const text of [
    'input.int(50, "Prevailing Lookback', 'barcolor(', 'DARK+ PURE', 'request.security(haT',
    'if barstate.isconfirmed and (darkBull or darkBear)', 'LOADED: ', 'showDark',
  ]) assert.ok(all.includes(text), `Missing Dark Orders: ${text}`);
  // Trend Predictor anchor
  for (const text of [
    'CC BY-NC-SA 4.0', 'VWAP + Volume-weighted EMA', 'baseDonchian', 'plot.style_linebr',
    'Show anchor glow',
  ]) assert.ok(all.includes(text), `Missing anchor: ${text}`);
  // My Session Range
  for (const text of [
    'RobMinty', 'input.session("0300-0700"', 'plot.style_stepline', 'fillgaps=false', 'showSession',
  ]) assert.ok(all.includes(text), `Missing session: ${text}`);
  // NQ Developing Volume Profile
  for (const text of [
    '16:00', 'NQ profile', 'f_anchor', 'areaPercent', 'max_boxes_count=200',
    'f_anchor(time[i]) != sessAnchor', 'not in loaded history',
  ]) assert.ok(all.includes(text), `Missing NQ: ${text}`);
  // VVWAP (daily reset)
  for (const text of [
    'VVWAP (daily)', 'showVVWAP', 'dayofmonth(time) != dayofmonth(time[1])',
  ]) assert.ok(all.includes(text), `Missing VVWAP: ${text}`);
  // Fixed Range Volume Profile (dedicated UTC+2 window)
  for (const text of [
    'Fixed Range VP', 'showFRVP', 'frvpNQOpen', 'frvpPreHours', 'frvpEndHour',
    'FTZ = "UTC+2"', 'prevDay = lastTod < endTotal', 'hour(time[i], FTZ)', 'position.bottom_left',
  ]) assert.ok(all.includes(text), `Missing FRVP: ${text}`);
});

test('All In One does not carry the standalone anchor calculation limit', () => {
  assert.doesNotMatch(all, /calc_bars_count=2500/);
});
