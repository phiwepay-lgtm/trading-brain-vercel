const test=require('node:test');
const assert=require('node:assert/strict');
test('package contains requested user-supplied specification without pretending statistics are verified',async()=>{
  const {packageFiles}=await import('../lib/ea-package.mjs');
  const files=packageFiles(2.1);
  assert.deepEqual(Object.keys(files).sort(),['README.txt','strategy.pine','system.json']);
  const system=JSON.parse(files['system.json']);
  assert.equal(system.version,'1.0-user-rules-unverified');
  assert.equal(system.exec.VLB.side,'SELL');assert.equal(system.exec.VHB.side,'BUY');
  assert.equal(system.setups['BT_0.382'].type,'continuation');assert.equal(system.setups['FTB_0.382'].type,'continuation-variant');
  assert.deepEqual([system.stats_source.trades,system.stats_source.total_pnl,system.stats_source.winrate_full_tp,system.stats_source.avg_R,system.stats_source.profit_factor],[40,303,27.5,1.8,4.7]);
  assert.equal(system.stats_source.verified,false);assert.match(system.stats_source.note,/not recomputed/);
  assert.equal(system.risk.selected_hypothetical_r,2.1);assert.match(system.risk.note,/ATR period/);
  assert.match(system.filters.note,/not independently validated/);assert.match(system.disclaimers.join(' '),/not backtest proof/);
  assert.match(files['README.txt'],/selected 1:2\.1/);assert.match(files['README.txt'],/not an MT5 EA/);
  assert.throws(()=>packageFiles(1.9),RangeError);assert.throws(()=>packageFiles(7.1),RangeError);assert.throws(()=>packageFiles(NaN),RangeError);
});
test('Pine is an indicator, with manual-only annotations and explicit unfinished logic',async()=>{
  const {packageFiles}=await import('../lib/ea-package.mjs');const p=packageFiles(7)['strategy.pine'];
  assert.match(p,/\/\/@version=5/);assert.match(p,/indicator\("BT_FTB_VLB_VHB_User_Rules_Manual_Study"/);
  assert.match(p,/input\.float\(0\.382/);assert.match(p,/input\.session\("1400-1600"/);assert.match(p,/input\.float\(7\.0/);
  assert.match(p,/TODO: VLB SELL/);assert.match(p,/TODO: VHB BUY/);assert.match(p,/TODO: Define engulfing/);
  assert.match(p,/Show manual M1 annotations/);assert.match(p,/no automatic signals/);assert.match(p,/requires manual validation/);
  assert.doesNotMatch(p,/strategy\.entry|strategy\.order|strategy\(/);
});
