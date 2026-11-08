const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pine = fs.readFileSync(path.join(__dirname, '../public/ea/TradingBrain_M5_M1_v15.pine'), 'utf8');

test('v15.3 preserves completed M5 HA data and makes bypass explicit', () => {
  assert.match(pine, /Bypass_Session = input\.bool\(true, "BYPASS ALL SESSION FILTERS FOR TEST"\)/);
  assert.match(pine, /inSession = Bypass_Session or \(Sessions_Confirmed and \(isNQ or isAsian\)\)/);
  assert.match(pine, /isGoldenSession = Enable_Simulation and isM1 and isStandard and inSession/);
  assert.match(pine, /Enable_Simulation = input\.bool\(false/);
  assert.match(pine, /haTicker = ticker\.heikinashi\(syminfo\.tickerid\)/);
  assert.match(pine, /f_completedHA\(\) =>\n\s+ph = ta\.pivothigh\(high, M5_Left, M5_Right\)\n\s+pl = ta\.pivotlow\(low, M5_Left, M5_Right\)/);
  assert.match(pine, /request\.security\(haTicker, "5", f_completedHA\(\), lookahead=barmerge\.lookahead_on\)/);
  assert.match(pine, /\[time\[1\], bar_index\[1\], open\[1\], high\[1\], low\[1\], close\[1\]/);
  assert.match(pine, /highIndex\[2\], lowIndex\[2\]\]/);
  assert.match(pine, /activeExpectedHighIndex := haIndex/);
  assert.match(pine, /activeExpectedLowIndex := haIndex/);
  assert.match(pine, /TEST BYPASS/);
});

test('session bypass never bypasses simulation opt-in, timeframe, or standard-chart guard', () => {
  // Independent reference model; not an execution or compilation of Pine.
  const canScan = ({enable, m1, standard, bypass, confirmed, window}) =>
    enable && m1 && standard && (bypass || (confirmed && window));
  assert.equal(canScan({enable:false,m1:true,standard:true,bypass:true,confirmed:false,window:false}), false);
  assert.equal(canScan({enable:true,m1:false,standard:true,bypass:true,confirmed:false,window:false}), false);
  assert.equal(canScan({enable:true,m1:true,standard:false,bypass:true,confirmed:false,window:false}), false);
  assert.equal(canScan({enable:true,m1:true,standard:true,bypass:true,confirmed:false,window:false}), true);
  assert.equal(canScan({enable:true,m1:true,standard:true,bypass:false,confirmed:false,window:true}), false);
  assert.equal(canScan({enable:true,m1:true,standard:true,bypass:false,confirmed:true,window:false}), false);
  assert.equal(canScan({enable:true,m1:true,standard:true,bypass:false,confirmed:true,window:true}), true);
});

test('debug shows actual pivot-update count rather than a one-bar boolean', () => {
  assert.match(pine, /var int m5PivotsToday = 0/);
  assert.match(pine, /newExchangeDay = ta\.change\(time\("D"\)\) != 0/);
  assert.match(pine, /if barstate\.isconfirmed\n\s+if newExchangeDay\n\s+m5PivotsToday := 0\n\s+if newHaM5\n\s+m5PivotsToday \+= \(isNewHighPivot \? 1 : 0\) \+ \(isNewLowPivot \? 1 : 0\)/);
  assert.match(pine, /Debug_M5 \? str\.tostring\(m5PivotsToday\)/);
  assert.match(pine, /HA Index \/ Active H-L/);
  const count = (previous, newDay, newM5, high, low) =>
    (newDay ? 0 : previous) + (newM5 ? Number(high) + Number(low) : 0);
  assert.equal(count(2, false, false, true, true), 2);
  assert.equal(count(2, false, true, true, false), 3);
  assert.equal(count(3, false, true, true, true), 5);
  assert.equal(count(5, true, true, false, true), 1);
});
