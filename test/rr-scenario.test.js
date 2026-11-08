const test = require('node:test');
const assert = require('node:assert/strict');
test('fixed outcome scenario excludes generic and contradictory labels and reports value conflicts', async () => {
  const {scenario}=await import('../lib/rr-scenario.mjs');
  const trades=[{status:'Full TP',outcome:'win',pnl:2,realR:2},{status:'SL',outcome:'loss',realR:-1},{status:'BE',outcome:'be',pnl:0},{outcome:'win'},{outcome:'loss'},{status:'Full TP',outcome:'loss'},{status:'Full TP',pnl:-5},{outcome:'Break Even'}];
  const s=scenario(trades,2);
  assert.deepEqual([s.tp,s.sl,s.be,s.included,s.unclassified,s.conflictingLabels,s.inconsistentValues],[2,1,2,5,2,1,1]);
  assert.equal(s.totalR,3);assert.equal(s.breakEvenWinRate,100/3);assert.equal(s.bestRatio,7);assert.equal(s.allRatiosTie,false);
  assert.equal(scenario(trades,7).totalR,13);
  assert.throws(()=>scenario(trades,1.9),RangeError);assert.throws(()=>scenario(trades,7.1),RangeError);assert.throws(()=>scenario(trades,NaN),RangeError);
});
test('empty and no full TPs produce unavailable or tied optima', async () => {
  const {scenario}=await import('../lib/rr-scenario.mjs');
  assert.equal(scenario([{outcome:'win'}],7).totalR,null);assert.equal(scenario([],7).bestRatio,null);
  const tie=scenario([{status:'Stop Loss'},{status:'BE'}],4.1);assert.equal(tie.totalR,-1);assert.equal(tie.allRatiosTie,true);assert.equal(tie.bestRatio,null);
});
test('recorded labels determine marker class and disagreements never impersonate a pattern', async () => {
  const {classifySetup,executionDefinition,markerVisual}=await import('../lib/setup-definitions.mjs');
  const vlb=classifySetup({dir:'sell',exec:'VLB + Engulf Trigger'});assert.deepEqual([vlb.side,vlb.kind,vlb.color],['SELL','vlb','#ff7181']);assert.match(vlb.label,/VLB Sell/);
  assert.deepEqual(markerVisual(vlb),{shape:'triangleDown',position:'aboveBar',color:'#ff7181'});
  const vhb=classifySetup({dir:'long',exec:'VHB + Engulf Trigger'});assert.deepEqual([vhb.side,vhb.kind,vhb.color],['BUY','vhb','#35ddb1']);assert.match(vhb.label,/VHB Buy/);
  assert.deepEqual(markerVisual(vhb),{shape:'triangleUp',position:'belowBar',color:'#35ddb1'});
  const ftb=classifySetup({dir:'sell',exec:'VLB',entryType:'FTB 0.382'});assert.deepEqual([ftb.side,ftb.kind,ftb.color],['SELL','ftb','#ffac4b']);assert.match(ftb.label,/FTB - Failed to break/);
  assert.deepEqual(markerVisual(ftb),{shape:'triangleDown',position:'aboveBar',color:'#ffac4b'});
  assert.equal(classifySetup({dir:'buy',exec:'VLB',entryType:'FTB'}).kind,'conflict');assert.equal(classifySetup({dir:'sell',exec:'VLB VHB'}).kind,'conflict');
  assert.deepEqual(markerVisual(ftb),{shape:'triangleDown',position:'aboveBar',color:'#ffac4b'});
  assert.equal(classifySetup({dir:'buy',exec:'other'}).kind,'unclassified');assert.equal(classifySetup({exec:'VLB'}).side,null);
  assert.match(executionDefinition('VLB + Engulf Trigger'),/Visual Low Break FOR SELLS/);assert.match(executionDefinition('VHB'),/Visual High Break FOR BUYS/);
});
