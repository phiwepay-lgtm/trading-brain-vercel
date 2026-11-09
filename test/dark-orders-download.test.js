const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');

const source = readFileSync('public/ea/Dark_Orders_Pure_Price.pine', 'utf8');
test('Dark Orders Pure Price uses the supplied price and Heikin Ashi filters without volume', () => {
  assert.match(source, /^\/\/@version=5\r?\nindicator\("Dark Orders Pure Price \+ History \[Blackwatch\]".*overlay=true/m);
  for (const fragment of [
    'input.int(50, "Prevailing Lookback', 'input.float(1.8, "Range Expansion',
    'input.float(1.8, "Body Expansion', 'barRange = high - low', 'body = math.abs(close - open)',
    'ta.sma(barRange, len)', 'ta.sma(body, len)', 'ta.stdev(barRange, len)', 'ta.stdev(body, len)',
    'rangeRvol = prevRange > 0 ? barRange / prevRange : 1.0',
    'bodyRvol = prevBody > 0 ? body / prevBody : 1.0',
    'isRangeUnusual = rangeRvol >= rangeMult and rangeZ >= 1.5',
    'isBodyUnusual = bodyRvol >= bodyMult and bodyZ >= 1.5',
    'request.security(haT, timeframe.period, [open, close])',
    'haExpanding = haBody > haBodyAvg * 1.2',
    'isUnusual = isRangeUnusual and isBodyUnusual',
    'darkBull = isUnusual and haExpanding and close > open',
    'darkBear = isUnusual and haExpanding and close < open',
    'barcolor(darkBull ? bullCol : darkBear ? bearCol : isUnusual ? warnCol : na',
    'alertcondition(darkBull', 'alertcondition(darkBear',
    'input.bool(true, "Show History Recap Table")',
    'input.int(20, "Number of recent signals in table", minval=1, maxval=100)',
    'if barstate.isconfirmed and (darkBull or darkBear)',
    'array.unshift(signalTimes, time)', 'array.unshift(signalPrices, close)',
    'array.size(signalTimes) > tableLookback', 'array.pop(signalTimes)',
    'if barstate.islast', 'table.clear(recap, 0, 0, 2, tableLookback + 1)',
    'syminfo.timezone', 'timeframe.period', '"LOADED: " + str.tostring(bullCount + bearCount)',
  ]) assert.ok(source.includes(fragment), `Missing ${fragment}`);
  assert.doesNotMatch(source, /\bvolume\b|strategy\.(entry|order|exit)/i);
  assert.equal(existsSync('public/ea/Dark_Orders_Candle_Body.pine'), false);
});
