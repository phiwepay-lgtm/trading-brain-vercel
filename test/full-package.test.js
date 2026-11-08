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
test('Pine source has non-repainting HTF data, explicit opt-in and visual-only output',()=>{
  const pine=fs.readFileSync('reference/legacy-ea/TradingBrain_GOLD_M1_VLB_VHB.pine','utf8');
  assert.match(pine,/^\/\/@version=5/);assert.match(pine,/input\.bool\(false, "Enable visual scanner/);assert.match(pine,/input\.bool\(true, "Use M5 HTF Filter/);
  assert.match(pine,/ta\.highest\(high, M5_Len\)\[1\].*lookahead=barmerge\.lookahead_on/);
  assert.match(pine,/ta\.lowest\(low, M5_Len\)\[1\].*lookahead=barmerge\.lookahead_on/);
  assert.match(pine,/close\[1\].*lookahead=barmerge\.lookahead_on/);
  assert.match(pine,/vlbCandidate and M1_VLB_valid/);assert.match(pine,/vhbCandidate and M1_VHB_valid/);
  assert.match(pine,/barstate\.isconfirmed/);assert.match(pine,/table\.new\(position\.top_right, 2, 6/);assert.match(pine,/box\.new/);
  assert.match(pine,/unverified/);assert.match(pine,/not verified VLB\/VHB/);
  const executable=pine.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(executable,/strategy\s*\(|strategy\.entry|strategy\.order|alertcondition\s*\(/);
});
test('MT5 source stays opt-in and contains no execution or network APIs',()=>{
  const mq=fs.readFileSync('reference/legacy-ea/TradingBrain.mq5','utf8');
  assert.match(mq,/Enable_Visual_Scanner = false/);assert.match(mq,/Use_M5_Filter = true/);
  assert.match(mq,/iHigh\(_Symbol,PERIOD_M5/);assert.match(mq,/iLow\(_Symbol,PERIOD_M5/);
  assert.match(mq,/m5shift\+1/);assert.match(mq,/OBJ_RECTANGLE/);assert.match(mq,/OBJ_ARROW/);
  assert.doesNotMatch(mq,/OrderSend\s*\(|OrderSendAsync\s*\(|CTrade|WebRequest\s*\(|trade\.Buy|trade\.Sell/);
});
