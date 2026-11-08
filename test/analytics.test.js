const {test}=require('node:test');const assert=require('node:assert/strict');
const analytics=import('../lib/journal-analytics.mjs'), filtering=import('../lib/journal-filter.mjs');
test('analytics use recorded fields, explicit Full TP denominator and flag contradictions',async()=>{
 const {summarize,analyze,numeric}=await analytics;
 const trades=[{entryType:'BT',exec:'VLB',bias:'Continuation',sess:'new-york',hour:14,status:'Full TP',outcome:'win',pnl:20,realR:2},{entryType:'BT',exec:'VLB',bias:'Continuation',sess:'new-york',hour:14,status:'Break Even',outcome:'be',pnl:0,realR:0},{entryType:'FTB',exec:'VHB',bias:'Reversal',sess:'london',hour:8,status:'Stop Loss',outcome:'loss',pnl:-10,realR:-1},{entryType:'FTB',outcome:'win',pnl:-3,realR:2},{outcome:'mystery',pnl:null,realR:null}];
 const s=summarize(trades);assert.equal(s.count,5);assert.equal(s.fullTP,1);assert.equal(s.fullTPRate,20);assert.equal(s.wins,2);assert.equal(s.winRate,40);assert.equal(s.decidedWinRate,2/3*100);assert.equal(s.beRate,20);assert.equal(s.lossRate,20);assert.equal(s.unknown,1);assert.equal(s.missingStatus,2);assert.equal(s.conflicts,1);assert.equal(s.totalPnl,7);assert.equal(s.totalR,3);assert.equal(s.avgR,.75);assert.equal(s.avgWinR,2);assert.equal(s.avgLossR,-1);assert.equal(s.profitFactor,20/13);assert.equal(s.expectancy,7/4);assert.equal(s.pnlN,4);assert.equal(s.rN,4);
 const a=analyze(trades);assert.equal(a.setup[0].count,2);assert.equal(a.bestCombo.label,'BT | VLB');assert.equal(a.bestHour.label,'new-york · 14:00');
 assert.equal(numeric(null),null);assert.equal(numeric(''),null);assert.equal(numeric(true),null);assert.equal(numeric('12xx'),null);assert.equal(numeric(' -2.25 '),-2.25);
 const empty=summarize([]);assert.equal(empty.fullTPRate,null);assert.equal(empty.totalPnl,null);assert.equal(empty.avgR,null);assert.equal(empty.profitFactor,null);
 assert.equal(summarize([{pnl:20,realR:1}]).profitFactor,null);
});
test('shared journal filters preserve indices and match all selected fields',async()=>{
 const {filterTrades,emptyFilters}=await filtering;const trades=[{entryType:'BT',exec:'VLB',bias:'Continuation',sess:'new-york',hour:14,outcome:'win',symbol:'GOLD XAU/USD'},{entryType:'FTB',exec:'VHB',bias:'Reversal',sess:'london',hour:8,outcome:'loss',symbol:'EURUSD'}];
 assert.deepEqual(filterTrades(trades,{...emptyFilters(),entryType:'bt'}).map(x=>x.index),[0]);
 assert.deepEqual(filterTrades(trades,{...emptyFilters(),exec:'VHB',outcome:'loss',sess:'LONDON',hour:'8'}).map(x=>x.index),[1]);
 assert.equal(filterTrades(trades,{...emptyFilters(),search:'gold',outcome:'loss'}).length,0);
});
