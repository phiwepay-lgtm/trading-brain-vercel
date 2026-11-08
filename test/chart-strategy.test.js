const {test} = require('node:test');
const assert = require('node:assert/strict');
const engine = import('../lib/strategy/research.mjs');
function fixture(kind='BT') {
  const m5=Array.from({length:225},(_,i)=>{let x=10;if(i===212)x=5;if(i===215)x=20;if(kind==='BT' && i===219)x=22;if(kind==='FTB' && i===218)x=16;return {time:i*300,open:x,high:x,low:x,close:x,volume:null};});
  if(kind==='FTB') Object.assign(m5[219],{open:5,high:20,low:5,close:5});
  const m1=Array.from({length:45},(_,i)=>({time:216*300+i*60,open:14,high:15,low:13,close:14,volume:null}));
  if(kind==='BT') {
    m1[12].high=18;m1[17].high=17;
    Object.assign(m1[21],{open:15.2,high:16,low:15,close:15.3});
    Object.assign(m1[22],{open:15.3,high:18,low:15,close:17.5});
    Object.assign(m1[23],{open:15.5,high:15.6,low:15.1,close:15.2});
    Object.assign(m1[24],{open:15.1,high:15.7,low:15,close:15.6});
  } else {
    m1[12].low=7;m1[17].low=9;
    Object.assign(m1[21],{open:11,high:12,low:9.5,close:10});
    Object.assign(m1[22],{open:10,high:11,low:8,close:8.5});
    Object.assign(m1[23],{open:10.5,high:11,low:10.4,close:10.8});
    Object.assign(m1[24],{open:10.9,high:11,low:10.1,close:10.2});
  }
  return {m1,m5};
}
const mirror=bars=>bars.map(b=>({...b,open:27-b.open,close:27-b.close,high:27-b.low,low:27-b.high}));
test('BT replay orders completed M5, M1 reaction, VHB and delayed engulf with fib filter',async()=>{
  const {replayResearch}=await engine, {m1,m5}=fixture();
  const r=replayResearch(m1,m5,{useFTB:false});
  assert.deepEqual(r.events.map(e=>e.kind),['BT','REACTION','VHB','ENTRY']);
  assert.equal(r.events[0].fib,15.506); assert.equal(r.events[3].time-r.events[2].time,120);
  assert.equal(r.events[3].stop,14.9);assert.equal(r.events[3].target,17.35);
  assert.deepEqual(replayResearch(m1,m5,{useFTB:false,fibToleranceTicks:0}).events.map(e=>e.kind),['BT','REACTION','VHB']);
  for(let i=8;i<=m1.length;i++) {
    const prefix=replayResearch(m1.slice(0,i),m5,{useFTB:false});
    assert.deepEqual(prefix.events,r.events.filter(e=>e.time<=m1[i-1].time));
  }
});
test('bearish BT mirrors bullish anchors and standard M1 VLB/engulf',async()=>{
  const {replayResearch}=await engine, {m1,m5}=fixture();
  const r=replayResearch(mirror(m1),mirror(m5),{useFTB:false});
  assert.deepEqual(r.events.map(e=>e.kind),['BT','REACTION','VLB','ENTRY']);
  assert.equal(r.events[0].direction,-1);assert.ok(Math.abs(r.events[0].fib-(27-15.506))<1e-10);
  assert.ok(r.events[3].stop>r.events[3].price);assert.ok(r.events[3].target<r.events[3].price);
});
test('FTB requires an actual touch and bypasses BT fib proximity',async()=>{
  const {replayResearch}=await engine, {m1,m5}=fixture('FTB');
  const r=replayResearch(m1,m5,{fibToleranceTicks:0});
  assert.deepEqual(r.events.map(e=>e.kind),['FTB','VLB','ENTRY']);
  assert.equal(r.events[2].setup,'FTB');assert.equal(r.events[2].fib,null);
  m5[219].high=19.99;
  assert.ok(!replayResearch(m1,m5).events.some(e=>e.kind==='FTB'));
  m5[219].high=20.31;
  assert.ok(!replayResearch(m1,m5).events.some(e=>e.kind==='FTB'));
});
test('engulf uses strict multiplier, full body and contiguous standard M1 bars',async()=>{
  const {engulfDirection}=await engine;
  const p={time:60,open:10,close:9}, exact={time:120,open:9,close:10.2};
  assert.equal(engulfDirection(p,exact,1.2),0);
  assert.equal(engulfDirection(p,{...exact,close:10.21},1.2),1);
  assert.equal(engulfDirection(p,{...exact,time:180,close:11},1.2),0);
});
test('sessions default bypass, require confirmation and use New York DST',async()=>{
  const {inResearchSession,defaultResearchParams}=await engine;
  const at=s=>Date.parse(s)/1000;
  assert.equal(inResearchSession(at('2025-07-01T13:30:00Z'),{...defaultResearchParams,bypassSession:false}),false);
  const p={...defaultResearchParams,bypassSession:false,sessionsConfirmed:true};
  assert.equal(inResearchSession(at('2025-07-01T13:30:00Z'),p),true);
  assert.equal(inResearchSession(at('2025-01-02T13:30:00Z'),p),false);
  assert.equal(inResearchSession(at('2025-01-02T14:30:00Z'),p),true);
  assert.equal(inResearchSession(at('2025-01-02T01:00:00Z'),p),true);
  assert.equal(inResearchSession(at('2025-01-02T06:00:00Z'),p),false);
});
