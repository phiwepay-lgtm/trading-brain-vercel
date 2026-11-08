const {test}=require('node:test');
const assert=require('node:assert/strict');
const pro=import('../lib/strategy/pro-v1-research.mjs');
function synthetic(){
  let price=2300,seed=1;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  return Array.from({length:20000},(_,i)=>{
    const open=price,close=open+(random()-.5)*3,high=Math.max(open,close)+random(),low=Math.min(open,close)-random();
    price=close;return {time:1700000100+i*60,open,high,low,close,volume:null};
  });
}
test('integrated synthetic replay keeps overlapping positions and accounts for every entry candidate',async()=>{
  const {runProV1Research}=await pro;
  const result=runProV1Research(synthetic(),{stopBufferTicks:1000,rr:10});
  const positions=[...result.positions.closed,...result.positions.open,...result.positions.censored];
  assert.ok(positions.length>1);
  assert.equal(positions.length+result.positions.invalidSignals,result.replay.diagnostics.entry);
  assert.ok(positions.some(a=>positions.some(b=>b.id!==a.id && b.time>a.time && b.time<(a.exitTime??a.lastTime??Infinity))));
  assert.ok(positions.some(a=>positions.some(b=>b.id!==a.id && b.direction!==a.direction && b.time>a.time && b.time<(a.exitTime??a.lastTime??Infinity))));
});
test('appending future bars does not revise earlier signals or closed positions',async()=>{
  const {runProV1Research}=await pro;const data=synthetic(),cut=15000,params={stopBufferTicks:1000,rr:10};
  const a=runProV1Research(data.slice(0,cut),params),b=runProV1Research(data,params);
  assert.deepEqual(b.replay.events.filter(e=>e.time<data[cut].time),a.replay.events);
  assert.deepEqual(b.positions.closed.filter(t=>t.exitTime<data[cut].time),a.positions.closed);
});
