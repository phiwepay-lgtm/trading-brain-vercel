const {test}=require('node:test');
const assert=require('node:assert/strict');
const ledgerModule=import('../lib/strategy/pro-v1-ledger.mjs');
const runnerModule=import('../lib/strategy/pro-v1-research.mjs');
const b=(time,open,high,low,close)=>({time,open,high,low,close});
const sig=(time,direction)=>({time,kind:'ENTRY',direction,price:100,stop:direction===1?90:110,target:direction===1?120:80});

test('independent overlapping long and short positions and no same-bar exits',async()=>{
  const {IndependentPositionLedger}=await ledgerModule; const l=new IndependentPositionLedger();
  l.advance(b(0,100,130,70,100));
  assert.equal(l.enter(sig(0,1)),1);assert.equal(l.enter(sig(0,-1)),2);
  assert.equal(l.open.length,2);assert.equal(l.closed.length,0);
  l.advance(b(60,100,105,85,95));
  assert.equal(l.closed.length,1);assert.equal(l.closed[0].id,1);assert.equal(l.closed[0].reason,'stop');assert.equal(l.closed[0].r,-1);
  assert.equal(l.open.length,1);assert.equal(l.open[0].id,2);
  l.advance(b(120,100,101,79,80));
  assert.equal(l.closed.length,2);assert.equal(l.closed[1].id,2);assert.equal(l.closed[1].reason,'target');assert.equal(l.closed[1].r,2);
});

test('double touch is censored, not counted as a win or loss',async()=>{
  const {IndependentPositionLedger}=await ledgerModule; const l=new IndependentPositionLedger();
  l.advance(b(0,100,101,99,100));l.enter(sig(0,1));
  l.advance(b(60,100,121,89,100));
  assert.equal(l.censored.length,1);assert.match(l.censored[0].reason,/intrabar order unknown/);
  assert.equal(l.closed.length,0);assert.equal(l.open.length,0);
});

test('missing minutes censor every position; a contiguous price gap uses the open',async()=>{
  const {IndependentPositionLedger}=await ledgerModule; const l=new IndependentPositionLedger();
  l.advance(b(0,100,101,99,100));l.enter(sig(0,1));l.enter(sig(0,-1));
  l.advance(b(120,100,101,99,100));assert.equal(l.censored.length,2);assert.equal(l.closed.length,0);
  l.enter(sig(120,-1));l.advance(b(180,115,116,110,112));
  assert.equal(l.closed[0].exit,115);assert.equal(l.closed[0].reason,'stop gap');assert.equal(l.closed[0].r,-1.5);
});

test('entry validation, ordering, and open positions are explicit',async()=>{
  const {IndependentPositionLedger}=await ledgerModule;const l=new IndependentPositionLedger();
  l.advance(b(0,100,101,99,100));
  assert.equal(l.enter({...sig(0,1),stop:101}),null);assert.equal(l.enter(sig(60,1)),null);
  assert.equal(l.invalidSignals,2);assert.equal(l.enter(sig(0,1)),1);
  assert.throws(()=>l.advance(b(0,100,101,99,100)),/unordered/);
  assert.throws(()=>l.advance(b(60,100,99,101,100)),/Invalid/);
  assert.equal(l.open.length,1);
});

test('research runner discloses assumptions and cannot run an invalid range',async()=>{
  const {runProV1Research}=await runnerModule;
  const data=Array.from({length:30},(_,i)=>b(i*60,100,101,99,100));
  const r=runProV1Research(data,{lookback:2,m5Left:1,m5Right:1,m1Left:1,m1Right:1});
  assert.equal(r.positions.open.length,0);assert.equal(r.positions.closed.length,0);
  assert.match(r.assumptions.model,/no trading costs/);assert.equal(r.assumptions.ambiguousExit,'censored');
  assert.throws(()=>runProV1Research(data,{}, {startTime:120,endTime:120}),/Invalid/);
});
