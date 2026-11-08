const {test}=require('node:test');
const assert=require('node:assert/strict');

test('report records each accepted position including open and censored without inferring outcomes',async()=>{
  const {buildSimulationReport,simulationTradesCSV,simulationReportHTML}=await import('../lib/strategy/report.mjs');
  const position=(time,setup='FTB')=>({time,observedAt:time+60,direction:1,setup,price:100,entryFill:100.1,stop:99,target:102,signalRisk:1});
  const closed={...position(1704067200),exitTime:1704067320,exit:102,reason:'target',gross:1.9,fee:.1,net:1.8,r:1.8};
  const censored={...position(1704067500,'BT'),lastTime:1704067560,gapObservedAt:1704067800,reason:'missing M1 interval'};
  const open=position(1704068100);
  const result={trades:[closed],censored:[censored],open,invalid:2,quality:{count:100,first:1704067200,last:1704073140,gaps:1,missingMinutes:3},metrics:{wins:1,losses:0,breakeven:0,equity:1.8,profitFactor:null,maxDrawdown:0},assumptions:{startTime:null,endTime:null,feePercent:0.05,spreadTicks:2,slippageTicks:0},replay:{params:{rr:2.5},diagnostics:{entry:5,gapResets:1},state:'ENTRY_SIGNAL'}};
  const report=buildSimulationReport({result,sourceName:'<script>alert(1)</script>',sourceWarning:'Some data unavailable',generatedAt:'2026-01-01T00:00:00.000Z'});
  assert.equal(report.summary.acceptedPositions,3);assert.equal(report.summary.invalidEntryCandidates,2);assert.deepEqual(report.positions.map(t=>t.status),['closed','censored','open']);
  assert.equal(report.positions[0].entryObservedUtc,'2024-01-01T00:01:00.000Z');assert.equal(report.positions[0].exitBarOpenUtc,'2024-01-01T00:02:00.000Z');
  assert.equal(report.positions[1].lastObservedBarOpenUtc,'2024-01-01T00:06:00.000Z');assert.equal(report.positions[1].gapObservedAtUtc,'2024-01-01T00:10:00.000Z');
  assert.equal(report.positions[1].netR,null);assert.equal(report.positions[2].exitFill,null);assert.equal(report.positions[2].lastObservedBarOpenUtc,new Date(result.quality.last*1000).toISOString());assert.equal(report.summary.profitFactorR,null);
  const csv=simulationTradesCSV(report);assert.equal(csv.trim().split('\r\n').length,4);assert.match(csv,/"censored"/);assert.match(csv,/"open"/);
  const html=simulationReportHTML(report);assert.match(html,/SIMULATION ONLY/);assert.match(html,/not trades executed on a demo or live broker account/);assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/Some data unavailable/);assert.match(html,/missing M1 interval/);
});

test('empty simulation report has undefined win rate and no invented positions',async()=>{
  const {buildSimulationReport,simulationTradesCSV}=await import('../lib/strategy/report.mjs');
  const report=buildSimulationReport({sourceName:'empty.csv',result:{trades:[],censored:[],open:null,invalid:0,quality:{count:1},metrics:{wins:0,losses:0,breakeven:0,equity:0,profitFactor:null,maxDrawdown:0},assumptions:{startTime:null,endTime:null},replay:{params:{},diagnostics:{},state:'NO_SESSION'}}});
  assert.equal(report.summary.winRatePercent,null);assert.equal(report.positions.length,0);assert.equal(simulationTradesCSV(report).trim().split('\r\n').length,1);
});
