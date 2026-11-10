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
    'RobMinty', 'input.session("1500-1900"', 'plot.style_stepline', 'fillgaps=false', 'showSession',
  ]) assert.ok(all.includes(text), `Missing session: ${text}`);
  // NQ Developing Volume Profile
  for (const text of [
    '16:00', 'NQ profile', 'f_anchor', 'areaPercent', 'max_boxes_count=400',
    'f_anchor(time[i]) != sessAnchor', 'not in loaded history',
  ]) assert.ok(all.includes(text), `Missing NQ: ${text}`);
  // VVWAP (daily reset)
  for (const text of [
    'VVWAP (daily)', 'showVVWAP', 'dayofmonth(time) != dayofmonth(time[1])',
  ]) assert.ok(all.includes(text), `Missing VVWAP: ${text}`);
  // Session Volume Profile (attached to the session range window)
  for (const text of [
    'Session VP', 'showFRVP', 'trackedStart', 'frStart[i] == frTrackedStart', 'position.bottom_left',
  ]) assert.ok(all.includes(text), `Missing FRVP: ${text}`);
});

test('All In One does not carry the standalone anchor calculation limit', () => {
  assert.doesNotMatch(all, /calc_bars_count=2500/);
});


test('Fixed-range profile has independent presets and reference body/wick allocation', () => {
  const profile = all.split('// ====================== 6.')[1];
  for (const text of ['LonesomeTheBlue', 'https://mozilla.org/MPL/2.0/',
    'frTimePreset', 'frCustomHours', 'frZone', 'frColors', 'frCustomVAUp',
    'frTrackedStart := frStart', 'frOverlap(', 'body + 2 * topWick + 2 * bottomWick',
    'above >= below', 'frPOCLabel := label.new', 'Session VP frozen']) {
    assert.ok(profile.includes(text), `Missing fixed-range feature: ${text}`);
  }
  assert.doesNotMatch(profile, /included \+ candidate > target/);
  assert.doesNotMatch(profile, /\b(mode|areaPercent|widthPct|sessionHours|sessionZone)\b/);
  assert.ok(profile.includes('int startBar = bar_index - array.get(frIdx, array.size(frIdx) - 1)'));
});


test('Pine delimiters balance outside comments and strings', () => {
  const stack = [];
  const pairs = { ')': '(', ']': '[' };
  const lines = all.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Pine uses line comments; quoted strings may contain delimiters or //.
    const code = lines[i].replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$/g,
      token => token.startsWith('//') ? '' : '""');
    for (const char of code) {
      if (char === '(' || char === '[') stack.push({ char, line: i + 1 });
      else if (char === ')' || char === ']') {
        assert.equal(stack.pop()?.char, pairs[char], `Unexpected ${char} on line ${i + 1}`);
      }
    }
  }
  assert.deepEqual(stack, [], 'Unclosed Pine delimiters');
});
