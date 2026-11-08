const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('full package system uses only local uploaded journal aggregates and preserves denominators',async()=>{
  const {journalSystem}=await import('../lib/full-package.mjs');
  const trades=[{status:'Full TP',outcome:'win',pnl:10,realR:2,notes:'SECRET'}, {status:'SL',outcome:'loss',pnl:-5,realR:-1}, {outcome:'win'}, {status:'Full TP',outcome:'loss',pnl:-1}];
  const s=journalSystem(trades);
  assert.equal(s.stats_source.trades,4);assert.equal(s.stats_source.total_pnl,4);assert.equal(s.stats_source.pnl_records,3);
  assert.equal(s.stats_source.full_tp_count,2);assert.equal(s.stats_source.full_tp_denominator,4);assert.equal(s.stats_source.winrate_full_tp,50);
  assert.equal(s.stats_source.conflicting_records,1);assert.equal(s.stats_source.avg_R,0.5);assert.equal(s.stats_source.r_records,2);
  assert.equal(s.stats_source.verified,false);assert.equal(s.risk.selected_hypothetical_r,null);
  assert.match(s.filters.session,/17:00/);assert.match(s.filters.note,/not validated/);assert.doesNotMatch(JSON.stringify(s),/SECRET/);
  const no=journalSystem(null);assert.equal(no.stats_source.status,'not_uploaded');assert.equal(no.stats_source.trades,undefined);
  const empty=journalSystem([]);assert.equal(empty.stats_source.trades,0);assert.equal(empty.stats_source.total_pnl,null);assert.equal(empty.stats_source.winrate_full_tp,null);
  assert.throws(()=>journalSystem({}),TypeError);
});
test('Pine skeleton explicitly discloses unimplemented logic and cannot submit orders',()=>{
  const pine=fs.readFileSync('public/ea/TradingBrain_GOLD_M1_VLB_VHB.pine','utf8');
  assert.match(pine,/^\/\/@version=5/);assert.match(pine,/indicator\("TradingBrain - GOLD M1 VLB\/VHB - 40 Trades", overlay=true\)/);
  assert.match(pine,/Best Hour: 17:00 NY/);assert.match(pine,/PF 4\.76/);assert.match(pine,/NOT implemented/);
  const executable=pine.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(executable,/strategy\s*\(|strategy\.entry|strategy\.order|alertcondition\s*\(/);
  assert.match(executable,/plot\(na/);
});
