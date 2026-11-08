import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMarketCSV,buildM5,historyQuality} from '../lib/strategy/history.mjs';
import {runResearchTester} from '../lib/strategy/tester.mjs';
import {defaultResearchParams,inResearchSession} from '../lib/strategy/research.mjs';

test('local CSV/MT5 parsing enforces UTC, M1 OHLC, duplicates and limits',()=>{
  const header='time,open,high,low,close,volume\n';
  assert.throws(()=>parseMarketCSV(header+'2024-01-01 00:00,10,12,9,11,2'),/Timezone missing/);
  const rows=parseMarketCSV(header+'2024-01-01T01:01:00+01:00,11,12,10,11,2\n2024-01-01T00:00:00Z,10,12,9,11,3');
  assert.equal(rows[0].time,1704067200);assert.equal(rows[1].time,1704067260);
  assert.equal(parseMarketCSV('<DATE>\t<TIME>\t<OPEN>\t<HIGH>\t<LOW>\t<CLOSE>\n2024.01.01\t00:00:00\t10\t12\t9\t11',{assumeUTC:true})[0].time,1704067200);
  assert.throws(()=>parseMarketCSV(header+'2024-02-30T00:00Z,10,12,9,11,2'),/Invalid date/);
  assert.throws(()=>parseMarketCSV(header+'2024-01-01T00:00:01Z,10,12,9,11,2'),/Invalid M1/);
  assert.throws(()=>parseMarketCSV(header+'2024-01-01T00:00Z,10,8,9,11,2'),/Invalid M1/);
  assert.throws(()=>parseMarketCSV(header+'2024-01-01T00:00Z,10,12,9,11,2\n2024-01-01T00:00Z,10,12,9,11,2'),/Duplicate/);
  assert.throws(()=>parseMarketCSV(header+'2024-01-01T00:00Z,10,12,9,11,2\n2024-01-01T00:01Z,10,12,9,11,2',{maxRows:1}),/exceeds/);
});
test('only complete contiguous M5 buckets are aggregated; quality reports gaps',()=>{
  const t=1704067200, bars=Array.from({length:10},(_,i)=>({time:t+i*60,open:10,high:12,low:9,close:11,volume:2}));
  const full=buildM5(bars);assert.equal(full.bars.length,2);assert.equal(full.bars[0].volume,10);
  const broken=bars.filter((_,i)=>i!==6);assert.equal(buildM5(broken).bars.length,1);assert.equal(buildM5(broken).incomplete,1);assert.equal(historyQuality(broken).missingMinutes,1);
});
function fixture(){let price=2300,seed=1;const r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};return Array.from({length:20000},(_,i)=>{const open=price,close=open+(r()-.5)*3,high=Math.max(open,close)+r(),low=Math.min(open,close)-r();price=close;return {time:1700000100+i*60,open,high,low,close,volume:null};});}
test('integrated research simulation handles stop-first, costs, position gaps and date bounds',()=>{
  const bars=fixture(), original=runResearchTester(bars);assert.ok(original.trades.length>0);
  const first=original.trades[0], index=bars.findIndex(b=>b.time===first.time), next=bars[index+1];
  const altered=bars.map(b=>({...b}));altered[index+1]={...next,open:first.price,high:Math.max(first.price,first.stop,first.target)+1,low:Math.min(first.price,first.stop,first.target)-1,close:first.price};
  const options={feePercent:0.01,spreadTicks:2,slippageTicks:1};
  const result=runResearchTester(altered,{},options), trade=result.trades[0];
  assert.equal(trade.reason,'stop');assert.equal(trade.exitTime,next.time);
  assert.ok(Math.abs(trade.entryFill-(trade.price+trade.direction*.02))<1e-9);
  assert.ok(Math.abs(trade.exit-(trade.stop-trade.direction*.02))<1e-9);
  assert.ok(Math.abs(trade.net-(trade.direction*(trade.exit-trade.entryFill)-(trade.entryFill+trade.exit)*.0001))<1e-9);
  assert.ok(Math.abs(trade.r-trade.net/Math.abs(trade.price-trade.stop))<1e-9);
  const missing=bars.filter((_,i)=>i!==index+1);const censored=runResearchTester(missing);const censoredFirst=censored.censored.find(t=>t.time===first.time&&t.reason==='missing M1 interval');assert.ok(censoredFirst);assert.equal(censoredFirst.lastTime,first.time);assert.equal(censoredFirst.gapObservedAt,first.time+120);
  const end=bars[index].time+60, bounded=runResearchTester(bars,{}, {endTime:end});assert.ok(bounded.trades.every(t=>t.exitTime<end));assert.equal(bounded.open?.time,first.time);
  assert.throws(()=>runResearchTester(bars,{}, {startTime:end,endTime:end}),/Invalid test range/);
});
test('custom session windows support midnight and respect confirmation',()=>{
  const time=Date.parse('2024-01-01T23:30:00Z')/1000;
  const p={...defaultResearchParams,bypassSession:false,sessionsConfirmed:true,nyStart:570,nyEnd:571,asiaStart:1380,asiaEnd:60};
  assert.equal(inResearchSession(time,p),true);assert.equal(inResearchSession(time,{...p,sessionsConfirmed:false}),false);
});
test('integrated replay does not revise events or closed fills when future bars are appended',()=>{
  const data=fixture(), cut=15000, prefix=runResearchTester(data.slice(0,cut)), whole=runResearchTester(data);
  assert.deepEqual(whole.replay.events.filter(e=>e.time<data[cut].time),prefix.replay.events);
  assert.deepEqual(whole.trades.filter(t=>t.exitTime<data[cut].time),prefix.trades);
});
test('Dukascopy minute decoder preserves real flat candles without manufacturing missing minutes',async()=>{
  const {decodeDukascopyMinutes}=await import('../lib/strategy/dukascopy.mjs');
  const payload={timestamp:1704067200000,shift:60000,multiplier:0.01,open:2000,high:2001,low:1999,close:2000,times:[0,3],opens:[0,0],highs:[0,-100],lows:[0,100],closes:[0,0],volumes:[1,0]};
  const rows=decodeDukascopyMinutes(payload);assert.deepEqual(rows.map(r=>r.time),[1704067200,1704067380]);assert.equal(rows[1].open,2000);assert.equal(rows[1].high,2000);assert.equal(rows[1].volume,0);
  assert.throws(()=>decodeDukascopyMinutes({...payload,opens:[0]}),/Invalid candle columns/);
});
