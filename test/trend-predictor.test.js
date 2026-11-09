const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const source = readFileSync('public/ea/Trend_Predictor.pine', 'utf8');

test('Trend Predictor is the confirmed anchor only, with original attribution', () => {
  assert.match(source, /^\/\/@version=6\r?\n/);
  for (const text of [
    'Zeiierman', 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    'input.string("VWAP + Volume-weighted EMA", "Anchor"',
    'options=["VWAP + Volume-weighted EMA", "EMA", "SMA", "VWMA", "VWAP", "Donchian Mid"]',
    'volumeWeight = validVolume ? volume : 0.0',
    'weightedCloseEma = ta.ema(close * volumeWeight, anchorLen)',
    'volumeEma = ta.ema(volumeWeight, anchorLen)',
    'volumeWeightedEma = validVolume and volumeEma > 0 ? weightedCloseEma / volumeEma : na',
    'blendedAnchor = validVolume and not na(baseVwap) and not na(volumeWeightedEma) ? (baseVwap + volumeWeightedEma) * 0.5 : na',
    'input.int(21, "Length"', 'ta.ema(close, anchorLen)',
    'ta.sma(close, anchorLen)', 'ta.vwma(close, anchorLen)', 'ta.vwap(hlc3)',
    'ta.highest(high, anchorLen)[1] + ta.lowest(low, anchorLen)[1]',
    '"VWMA" => na(baseVwma) ? baseEma : baseVwma',
    '"VWAP" => na(baseVwap) ? baseEma : baseVwap',
    'confirmedAnchor = anchOn and barstate.isconfirmed ? anchor : na',
    'plot(glowOn ? confirmedAnchor : na', 'plot(confirmedAnchor, "Anchor"',
  ]) assert.ok(source.includes(text), `Missing ${text}`);
  assert.doesNotMatch(source, /\b(?:label\.new|plotshape|plotcandle|alert|alertcondition|request\.security_lower_tf)\s*\(/);
  assert.equal((source.match(/^plot\(/gm) || []).length, 2);
  assert.doesNotMatch(source, /lookahead_on/);
});

test('separate Trend Predictor preview and download disclose limitations', () => {
  const page = readFileSync('app/trend-predictor/trend-predictor.tsx', 'utf8');
  for (const text of ['/ea/Trend_Predictor.pine', 'no BUY or SELL signals', 'data-provider corrections', 'Zeiierman', 'CC BY-NC-SA 4.0']) assert.ok(page.includes(text));
  const darkOrders = readFileSync('app/ea/download-center.tsx', 'utf8');
  assert.ok(darkOrders.includes('separate from Dark Orders'));
});
