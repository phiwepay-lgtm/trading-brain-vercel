const test=require('node:test');
const assert=require('node:assert/strict');
// Independent fixture calculations: the source files themselves require platform compilation.
function bias(bars, len) {
  if (bars.length<len) return null;
  const sample=bars.slice(-len), high=Math.max(...sample.map(b=>b.high)),low=Math.min(...sample.map(b=>b.low));
  if(high<=low)return null;
  const bt=high-(high-low)*.382,ftb=low+(high-low)*.382,close=sample.at(-1).close;
  return {bt,ftb,bias:close>bt?'BEARISH':close<ftb?'BULLISH':'NEUTRAL'};
}
function candidate(prior,current,filter,b,enabled=true,confirmed=true,contiguous=true) {
  if(!enabled || !confirmed || !contiguous || !prior.length)return 'HOLD';
  const p=prior.at(-1),hi=Math.max(...prior.map(x=>x.high)),lo=Math.min(...prior.map(x=>x.low));
  const sell=current.close<current.open && p.close>p.open && current.open>=p.close && current.close<=p.open && current.high>=hi;
  const buy=current.close>current.open && p.close<p.open && current.open<=p.close && current.close>=p.open && current.low<=lo;
  return sell && (!filter||b==='BEARISH')?'VLB':buy && (!filter||b==='BULLISH')?'VHB':'HOLD';
}
test('requested levels, strict thresholds, zero range and unavailable history',()=>{
  const bars=[{high:100,low:0,close:20},{high:90,low:10,close:80}], r=bias(bars,2);
  assert.equal(r.bt,61.8);assert.equal(r.ftb,38.2);assert.equal(r.bias,'BEARISH');
  assert.equal(bias([{high:100,low:0,close:61.8}],1).bias,'NEUTRAL');
  assert.equal(bias([{high:100,low:0,close:38.2}],1).bias,'NEUTRAL');
  assert.equal(bias([{high:100,low:0,close:38}],1).bias,'BULLISH');
  assert.equal(bias([{high:1,low:1,close:1}],1),null);assert.equal(bias(bars,3),null);
});
test('candidate confluence, opt-in, confirmed close, gaps, and filter bypass',()=>{
  const bullish=[{open:4,close:6,high:6,low:4}], bearish=[{open:6,close:4,high:6,low:4}];
  const sell={open:6,close:4,high:7,low:3},buy={open:4,close:6,high:7,low:3};
  assert.equal(candidate(bullish,sell,true,'BEARISH'),'VLB');assert.equal(candidate(bearish,buy,true,'BULLISH'),'VHB');
  assert.equal(candidate(bullish,sell,true,'BULLISH'),'HOLD');assert.equal(candidate(bearish,buy,true,'NEUTRAL'),'HOLD');
  assert.equal(candidate(bullish,sell,true,null),'HOLD');assert.equal(candidate(bullish,sell,false,null),'VLB');
  assert.equal(candidate(bullish,sell,true,'BEARISH',false),'HOLD');assert.equal(candidate(bullish,sell,true,'BEARISH',true,false),'HOLD');assert.equal(candidate(bullish,sell,true,'BEARISH',true,true,false),'HOLD');
  assert.equal(candidate(bullish,{...sell,high:5},true,'BEARISH'),'HOLD');
});
