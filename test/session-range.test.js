const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const pine = readFileSync('public/ea/Blackwatch_My_Session_Range.pine', 'utf8');
const indie = readFileSync('public/ea/Blackwatch_My_Session_Range.indie.txt', 'utf8');

test('Pine session range uses an explicit timezone and developing step plots', () => {
  assert.match(pine, /^\/\/@version=6\n/);
  for (const text of ['RobMinty', "input.session('0300-0700'", "input.string('UTC-5'", 'America/New_York', 'endOfDay <= startOfDay', "sessionHours + ':1234567'", 'startTime != trackedStart', 'sessionHigh := math.max(sessionHigh, high)', 'sessionLow := math.min(sessionLow, low)', 'newSession and inSession[1]', 'plot.style_stepline', 'fillgaps=false']) assert.ok(pine.includes(text), `Missing ${text}`);
  assert.equal((pine.match(/^indicator\(/gm) || []).length, 1);
  assert.doesNotMatch(pine, /box\.new/);
});

test('Indie session range uses developing step plots without a rectangle', () => {
  assert.match(indie, /^# indie:lang_version = 5\n/);
  for (const text of ['RobMinty', "default='Etc/GMT+5'", 'days=ALL_DAYS', 'self.time[0] in self._session', 'self._session.is_same_period(last_seen[1], self.time[0])', 'range_high[0] = max(range_high[1], self.high[0])', 'range_low[0] = min(range_low[1], self.low[0])', "@plot.steps('session_high'", "@plot.steps('session_low'", "@plot.fill('session_high', 'session_low'", 'break_plot = last_seen[1] == self.time[1]', 'plot.Fill(color=fill_color)']) assert.ok(indie.includes(text), `Missing ${text}`);
  assert.doesNotMatch(indie, /Rectangle|plot\.candles/);
});

test('Indie running range behavior is checked with a Python mock', () => {
  const { execFileSync } = require('node:child_process');
  assert.match(execFileSync('python3', ['test/session-range-mock.py'], { encoding: 'utf8' }), /mock checks passed/);
});
