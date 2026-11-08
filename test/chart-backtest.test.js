const {test}=require('node:test');
const assert=require('node:assert/strict');
const mod=import('../lib/strategy/backtest.mjs');
const bar=(time,open,high,low,close)=>({time,open,high,low,close});
const entry=(time,direction=1)=>({time,kind:'ENTRY',direction,price:100,stop:direction===1?90:110,target:direction===1?120:80});
test('stop first on ambiguous OHLC bars; entry is not exited on its signal bar',async()=>{
  const {simulateCandidates}=await mod;
  const bars=[bar(0,100,130,80,100),bar(60,100,121,89,100)];
  const r=simulateCandidates(bars,[entry(0)]);
  assert.equal(r.trades.length,1);assert.equal(r.trades[0].exitTime,60);assert.equal(r.trades[0].reason,'stop');assert.equal(r.equity,-1);
});
test('short gap executes at open; overlapping entries skipped',async()=>{
  const {simulateCandidates}=await mod;
  const bars=[bar(0,100,101,99,100),bar(60,100,105,95,100),bar(120,115,116,110,112)];
  const r=simulateCandidates(bars,[entry(0,-1),entry(60,1)]);
  assert.equal(r.skipped,1);assert.equal(r.trades[0].exit,115);assert.equal(r.trades[0].r,-1.5);
});
test('censors positions across missing bars, separates open trades and undefined profit factor',async()=>{
  const {simulateCandidates}=await mod;
  const r=simulateCandidates([bar(0,100,101,99,100),bar(120,100,101,99,100)], [entry(0),entry(120)]);
  assert.equal(r.censored.length,1);assert.equal(r.trades.length,0);assert.ok(r.open);assert.equal(r.profitFactor,null);
});
