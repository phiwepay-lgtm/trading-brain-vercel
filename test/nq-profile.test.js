const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const pine = readFileSync('public/ea/NQ_Developing_Volume_Profile.pine', 'utf8');
const indie = readFileSync('public/ea/NQ_Developing_Volume_Profile.indie.txt', 'utf8');
test('NQ drafts declare their session, approximation and scan limits', () => {
  assert.match(pine, /America\/New_York/);
  assert.match(pine, /hour\(t, TZ\) >= 16/);
  assert.match(pine, /found == maxBars/);
  assert.match(pine, /candidate > target/);
  assert.match(indie, /ScheduleRule\(start=time\(hour=16\), end=time\(hour=16\), days=ALL_DAYS\)/);
  assert.match(indie, /self\._window\.is_same_period/);
  assert.match(indie, /candidate > target/);
  assert.match(indie, /SCAN LIMIT/);
  execFileSync('python3', ['-c', 'import ast; ast.parse(open("public/ea/NQ_Developing_Volume_Profile.indie.txt").read())']);
});
test('Indie draft profile runs in a Python mock, including reset and volume invariants', () => {
  assert.match(execFileSync('python3', ['test/nq-profile-mock.py'], { encoding: 'utf8' }), /mock checks passed/);
});
