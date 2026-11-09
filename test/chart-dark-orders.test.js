const {test}=require('node:test');
const assert=require('node:assert/strict');
const {calculateDarkOrders,compareDarkOrders}=require('../lib/strategy/dark-orders.mjs');
const make=(i,volume=100+(i%2)*10)=>({time:i*300,open:100,high:101,low:99,close:100.2,volume});

test('warmup, quiet baseline, strong volume absorption, and dark sequences',()=>{
  const base=Array.from({length:70},(_,i)=>make(i));
  base[60]={...base[60],high:100.05,low:99.95,close:100.01,volume:10000};
  const result=calculateDarkOrders(base);
  assert.equal(result[48].type,'unknown');
  assert.equal(result[49].type,'quiet');
  assert.equal(result[60].type,'absorption');
  const dark=Array.from({length:55},(_,i)=>make(i,i<50?100+(i%2)*10:300));
  for(let i=50;i<55;i++)dark[i]={...dark[i],high:100.3,low:99.7,close:100.1};
  const outcomes=calculateDarkOrders(dark);
  assert.equal(outcomes[52].darkCount,3);
  assert.ok(['dark','absorption'].includes(outcomes[52].type));
});

test('missing volume, zero variance and gaps are unknown and restart warm-up',()=>{
  const bars=Array.from({length:120},(_,i)=>make(i));
  bars[60]={...bars[60],volume:null};
  assert.equal(calculateDarkOrders(bars)[60].type,'unknown');
  assert.equal(calculateDarkOrders(bars)[109].type,'unknown');
  assert.notEqual(calculateDarkOrders(bars)[110].type,'unknown');
  const gap=bars.filter((_,i)=>i!==60);
  assert.equal(calculateDarkOrders(gap)[60].type,'unknown');
  const constant=Array.from({length:70},(_,i)=>make(i,100));
  assert.equal(calculateDarkOrders(constant)[69].type,'unknown');
});

test('entry close sees only most recent complete M5, never future and never stale',()=>{
  const bars=Array.from({length:62},(_,i)=>make(i));
  bars[60]={...bars[60],high:100.05,low:99.95,close:100.01,volume:10000};
  const trades=[{time:60*300+180,r:-1},{time:60*300+240,r:2},{time:61*300+60,r:-1},{time:70*300,r:2}];
  const result=compareDarkOrders(bars,{trades,open:{},censored:[{}]});
  assert.equal(result.unmatched.closed,1);
  assert.equal(result.matched.closed,2);
  assert.equal(result.absorption.closed,2);
  assert.equal(result.unknown.closed,1);
  assert.equal(result.matched.meanR,0.5);
  assert.equal(result.open,1);assert.equal(result.censored,1);
  assert.equal(result.allClosed.closed,4);
});
