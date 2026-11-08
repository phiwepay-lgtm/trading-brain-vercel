const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pine = fs.readFileSync(path.join(__dirname, '../public/ea/TradingBrain_M5_M1_v15.pine'), 'utf8');
// Independent mock; it does not execute or compile Pine.
function routeFTB({ enabled, session, closed, level, high, low, open, close, priorBull, priorBear, tol }) {
  if (!enabled || !session || !closed) return null;
  if (high >= level-tol && close < level && close < open && priorBull) return { direction:'bear', state:'WAITING_CHOCH' };
  if (low <= level+tol && close > level && close > open && priorBear) return { direction:'bull', state:'WAITING_CHOCH' };
  return null;
}
test('FTB routes to M1 without BT fib', () => {
  const highFail = {enabled:true,session:true,closed:true,level:100,high:100,low:95,open:99,close:98,priorBull:true,priorBear:false,tol:1};
  assert.deepEqual(routeFTB(highFail), {direction:'bear',state:'WAITING_CHOCH'});
  assert.equal(routeFTB({...highFail,closed:false}), null);
  assert.equal(routeFTB({...highFail,session:false}), null);
  assert.equal(routeFTB({...highFail,priorBull:false}), null);
  const lowFail = {...highFail,high:105,low:100,open:101,close:102,priorBull:false,priorBear:true};
  assert.deepEqual(routeFTB(lowFail), {direction:'bull',state:'WAITING_CHOCH'});
  assert.match(pine, /ticker\.heikinashi\(syminfo\.tickerid\)/);
  assert.match(pine, /request\.security\(haTicker, "5", f_completedHA\(\), lookahead=barmerge\.lookahead_on\)/);
  assert.match(pine, /state := ambiguous \? "AMBIGUOUS" : setupType == "FTB" \? "FTB_FOUND"/);
  assert.match(pine, /if state == "FTB_FOUND" and bar_index > bosBar\s+state := "WAITING_CHOCH"/);
  assert.match(pine, /pathReady = setupType == "FTB" or \(setupType == "BT" and nearFib\)/);
  assert.match(pine, /Enable_Simulation = input\.bool\(false/);
});
