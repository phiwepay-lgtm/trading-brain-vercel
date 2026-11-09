const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const pine = readFileSync('public/ea/Blackwatch_My_Session_Range.pine', 'utf8');
const indie = readFileSync('public/ea/Blackwatch_My_Session_Range.indie.txt', 'utf8');

test('Pine session range uses an explicit session timezone and latest-range state', () => {
  assert.match(pine, /^\/\/@version=6\n/);
  for (const text of ['RobMinty', "input.session('0300-0700'", "input.string('UTC-5'", 'America/New_York', 'endOfDay <= startOfDay', "sessionHours + ':1234567'", 'startTime != trackedStart', 'sessionHigh := math.max(sessionHigh, high)', 'sessionLow := math.min(sessionLow, low)', 'box.set_rightbottom', 'showHorizontal ? edgeColor : na', 'showVertical ? edgeColor : na']) assert.ok(pine.includes(text), `Missing ${text}`);
  assert.equal((pine.match(/^indicator\(/gm) || []).length, 1);
});

test('Indie session range draft handles schedule, resets and partial box transparently', () => {
  assert.match(indie, /^# indie:lang_version = 5\n/);
  for (const text of ['RobMinty', 'NOT compiled', "default='Etc/GMT+5'", 'days=ALL_DAYS', 'self.time[0] in self._session', 'self._session.is_same_period(last_seen[1], self.time[0])', 'range_high[0] = max(range_high[1], self.high[0])', 'range_low[0] = min(range_low[1], self.low[0])', 'right = last_seen[0]', 'self.chart.draw(self._box)']) assert.ok(indie.includes(text), `Missing ${text}`);
});
