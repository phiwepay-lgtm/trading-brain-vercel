import { heikinAshi } from '../chart-math.mjs';
import { pivotAt } from '../indicators/pivots.mjs';
import { ActiveLevelTracker } from '../indicators/activeLevels.mjs';

export const defaultResearchParams = Object.freeze({
  m5Left:2, m5Right:2, m1Left:2, m1Right:2, lookback:200,
  useFTB:true, requireColorShift:true, ftbTouchTicks:30, fibToleranceTicks:30,
  tickSize:0.01, stopBufferTicks:10, rr:2.5, engulfMultiplier:1.2,
  edge:'both', bypassSession:true, sessionsConfirmed:false, nyStart:570, nyEnd:960, asiaStart:60, asiaEnd:360,
});
const nyClock = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function inResearchSession(time, p) {
  if (p.bypassSession) return true;
  if (!p.sessionsConfirmed) return false;
  const date = new Date(time*1000), parts=nyClock.formatToParts(date);
  const ny=Number(parts.find(x=>x.type==='hour').value)*60+Number(parts.find(x=>x.type==='minute').value);
  const utc=date.getUTCHours()*60+date.getUTCMinutes();
  const within=(value,start,end)=>start<end ? value>=start && value<end : value>=start || value<end;
  return within(ny,p.nyStart,p.nyEnd) || within(utc,p.asiaStart,p.asiaEnd);
}
export function validResearchParams(p) {
  return ['m5Left','m5Right','m1Left','m1Right'].every(k=>Number.isInteger(p[k]) && p[k]>=1 && p[k]<=50) &&
    Number.isInteger(p.lookback) && p.lookback>=2 && p.lookback<=1000 &&
    ['ftbTouchTicks','fibToleranceTicks','stopBufferTicks'].every(k=>Number.isInteger(p[k]) && p[k]>=0 && p[k]<=10000) &&
    Number.isFinite(p.tickSize) && p.tickSize>0 && Number.isFinite(p.rr) && p.rr>0 && p.rr<=100 &&
    Number.isFinite(p.engulfMultiplier) && p.engulfMultiplier>=1 && p.engulfMultiplier<=100 &&
    ['nyStart','nyEnd','asiaStart','asiaEnd'].every(k=>Number.isInteger(p[k]) && p[k]>=0 && p[k]<1440) && p.nyStart!==p.nyEnd && p.asiaStart!==p.asiaEnd &&
    ['both','bt','ftb'].includes(p.edge) && ['useFTB','requireColorShift','bypassSession','sessionsConfirmed'].every(k=>typeof p[k]==='boolean');
}
export function engulfDirection(previous, current, multiplier=1.2) {
  if (!previous || current.time-previous.time!==60) return 0;
  if (previous.close<previous.open && current.close>current.open && current.open<=previous.close && current.close>previous.open && current.close-current.open>(previous.open-previous.close)*multiplier) return 1;
  if (previous.close>previous.open && current.close<current.open && current.open>=previous.close && current.close<previous.open && current.open-current.close>(previous.close-previous.open)*multiplier) return -1;
  return 0;
}
export function fibForBT(direction, low, high) {
  if (!(low>0 && high>low)) return null;
  return direction===1 ? high-(high-low)*0.382 : low+(high-low)*0.382;
}
const roundTick=(value,tick)=>Math.round(value/tick)*tick;
const emptySetup=()=>({direction:0,type:'NONE',fib:null,failedLevel:null,bosTime:null,reactionTime:null,chochTime:null,chochLevel:null});
function checkBars(bars, interval) {
  for (let i=0;i<bars.length;i++) {
    const b=bars[i];
    if (!Number.isSafeInteger(b.time) || b.time%interval!==0 || (i && b.time<=bars[i-1].time) || ![b.open,b.high,b.low,b.close].every(x=>Number.isFinite(x) && x>0) || b.high<Math.max(b.open,b.close,b.low) || b.low>Math.min(b.open,b.close,b.high)) throw new Error(`Invalid or unordered ${interval===60?'M1':'M5'} candles`);
  }
}
/**
 * Closed-bar candidate replay, not a broker emulator. Assumes candle times are UTC opens.
 * A signal's `time` is its M1 open; it becomes observable only after that candle closes.
 * No order/position state, execution costs, fills or MT5 connection are modeled.
 */
export function replayResearch(m1, m5, supplied={}, options={}) {
  const p={...defaultResearchParams,...supplied};
  if (!validResearchParams(p)) throw new Error('Invalid research parameters');
  checkBars(m1,60); checkBars(m5,300);
  const ha=heikinAshi(m5), tracker=new ActiveLevelTracker({left:p.m5Left,right:p.m5Right,lookback:p.lookback});
  const events=[], diagnostics={processedM1:0,observedM5:0,missingM1:0,missingM5:0,skippedM5:0,bt:0,ftb:0,reactions:0,choch:0,engulf:0,fibBlocked:0,edgeBlocked:0,timingBlocked:0,positionBars:0,gapResets:0,entry:0,ambiguous:0};
  let state='NO_SESSION', setup=emptySetup(), lastM5=null, usedHigh=null, usedLow=null, m5cursor=-1;
  const highs=[], lows=[], haHighs=[], haLows=[]; let latestHAHigh=null, latestHALow=null;
  const emit=(kind,bar,extra={})=>{const event={kind,time:bar.time,observedAt:bar.time+60,...extra};events.push(event);return event;};
  const minM1=Math.max(4,p.m1Left+p.m1Right+4), minM5=p.lookback+p.m5Left+p.m5Right+4;
  for (let k=0;k<m1.length;k++) {
    const b=m1[k];
    const execution=options.onBar?.(b) || {};
    const hasGap=options.resetOnGap && k>0 && b.time-m1[k-1].time!==60;
    if (hasGap) {state='NO_SESSION';setup=emptySetup();diagnostics.gapResets++;}
    // Pivot detection is incremental and cannot use future M1 bars.
    const candidate=k-p.m1Right;
    for (const [isHigh,list] of [[true,highs],[false,lows]]) {
      const pivot=pivotAt(m1,candidate,k,p.m1Left,p.m1Right,isHigh);
      if (pivot) {list.unshift(pivot);if(list.length>2)list.pop();}
    }
    if (k+1<minM1) { diagnostics.missingM1++; continue; }
    diagnostics.processedM1++;
    while (m5cursor+1<m5.length && m5[m5cursor+1].time<=b.time) {
      m5cursor++;
      latestHAHigh=pivotAt(ha,m5cursor-p.m5Right,m5cursor,p.m5Left,p.m5Right,true) || latestHAHigh;
      latestHALow=pivotAt(ha,m5cursor-p.m5Right,m5cursor,p.m5Left,p.m5Right,false) || latestHALow;
      haHighs[m5cursor]=latestHAHigh;haLows[m5cursor]=latestHALow;
    }
    // As in the tester, process a completed M5 on an M1 close in the following
    // M5 interval. Without a corresponding current M5 candle it is unknown.
    const currentStart=Math.floor(b.time/300)*300;
    let bullBos=false,bearBos=false,failedHigh=false,failedLow=false, hi=null,lo=null, levelHigh=null,levelLow=null, bLow=null,bHigh=null;
    const e=m5cursor>=0 && m5[m5cursor].time+300<=currentStart ? m5cursor : m5cursor-1;
    if (hasGap) tracker.invalidate({high:haHighs[e-1],low:haLows[e-1]});
    if (e>=0 && ha[e].time+300===currentStart && ha[e].time!==lastM5) {
      if (e+1<minM5) { diagnostics.missingM5++; continue; }
      const levels=tracker.update(ha,e,{high:haHighs[e-1],low:haLows[e-1]}); lastM5=ha[e].time; diagnostics.observedM5++; diagnostics.skippedM5=levels.skipped;
      hi=haHighs[e]; lo=haLows[e];
      const fresh=x=>x?.valid && e-x.index<=p.lookback*2;
      bullBos=fresh(hi) && ha[e].close>hi.value && usedHigh!==hi.time;
      bearBos=fresh(lo) && ha[e].close<lo.value && usedLow!==lo.time;
      levelHigh=levels.high?.value ?? null; levelLow=levels.low?.value ?? null;
      const bound=p.ftbTouchTicks*p.tickSize;
      failedHigh=p.useFTB && levelHigh!==null && ha[e].high>=levelHigh && ha[e].high<=levelHigh+bound && ha[e].close<levelHigh && ha[e].close<ha[e].open && (!p.requireColorShift || ha[e-1].close>ha[e-1].open);
      failedLow=p.useFTB && levelLow!==null && ha[e].low<=levelLow && ha[e].low>=levelLow-bound && ha[e].close>levelLow && ha[e].close>ha[e].open && (!p.requireColorShift || ha[e-1].close<ha[e-1].open);
      if (bullBos) {bLow=fresh(lo)?lo.value:null; bHigh=ha[e].high;}
      if (bearBos) {bLow=ha[e].low; bHigh=fresh(hi)?hi.value:null;}
    }
    if (hasGap) continue;
    if (options.startTime != null && b.time < options.startTime) {state='NO_SESSION';setup=emptySetup();continue;}
    if (!inResearchSession(b.time,p)) {state='NO_SESSION';setup=emptySetup();continue;}
    if (execution.open) {state='ENTRY_SIGNAL';diagnostics.positionBars++;continue;}
    if (execution.closed) {state='EXPECTING_BOS';setup=emptySetup();continue;}
    if (state==='NO_SESSION' || state==='ENTRY_SIGNAL') state='EXPECTING_BOS';
    if (bullBos) diagnostics.bt++; if (bearBos) diagnostics.bt++;
    if (failedHigh) diagnostics.ftb++; if (failedLow) diagnostics.ftb++;
    const count=[bullBos,bearBos,failedHigh,failedLow].filter(Boolean).length;
    if (count) {
      if (bullBos) usedHigh=hi.time;
      if (bearBos) usedLow=lo.time;
      setup=emptySetup();setup.bosTime=b.time;
      if (count!==1) {state='AMBIGUOUS';diagnostics.ambiguous++;emit('AMBIGUOUS',b);continue;}
      setup.direction=(bullBos || failedLow)?1:-1;
      setup.type=(bullBos || bearBos)?'BT':'FTB';
      if (setup.type==='FTB') {
        setup.failedLevel=failedHigh?levelHigh:levelLow;setup.reactionTime=b.time;state='FTB_FOUND';
        emit('FTB',b,{direction:setup.direction,price:setup.failedLevel});
      } else {
        setup.fib=fibForBT(setup.direction,bLow,bHigh);
        if (setup.fib===null) {state='WAITING_ANCHORS';emit('BT_NO_ANCHORS',b,{direction:setup.direction});continue;}
        state='BT_FOUND';emit('BT',b,{direction:setup.direction,price:b.close,fib:setup.fib,low:bLow,high:bHigh});
      }
      continue;
    }
    if (state==='FTB_FOUND' && b.time>setup.bosTime) state='WAITING_CHOCH';
    if (state==='BT_FOUND' && b.time>setup.bosTime) state='WAITING_0382';
    if (state==='WAITING_0382' && b.time>setup.bosTime && b.low<=setup.fib && b.high>=setup.fib) {state='WAITING_CHOCH';setup.reactionTime=b.time;diagnostics.reactions++;emit('REACTION',b,{direction:setup.direction,price:setup.fib});}
    const h=highs[0], ph=highs[1], l=lows[0], pl=lows[1], prev=m1[k-1];
    if (state==='WAITING_CHOCH' && b.time>setup.reactionTime && setup.direction===1 && h && ph && h.value<ph.value && prev.close<=h.value && b.close>h.value) {
      state='CHOCH_FOUND';setup.chochLevel=h.value;setup.chochTime=b.time;diagnostics.choch++;emit('VHB',b,{direction:1,price:h.value});
    } else if (state==='WAITING_CHOCH' && b.time>setup.reactionTime && setup.direction===-1 && l && pl && l.value>pl.value && prev.close>=l.value && b.close<l.value) {
      state='CHOCH_FOUND';setup.chochLevel=l.value;setup.chochTime=b.time;diagnostics.choch++;emit('VLB',b,{direction:-1,price:l.value});
    }
      const pathReady=setup.type==='FTB' || (setup.type==='BT' && setup.fib!==null && (options.btEntryProximity===false || Math.abs(b.close-setup.fib)<=p.fibToleranceTicks*p.tickSize));
    const edgeAllowed=p.edge==='both' || (setup.type==='BT' && p.edge==='bt') || (setup.type==='FTB' && p.edge==='ftb');
    const matchedEngulf=state==='CHOCH_FOUND' && engulfDirection(prev,b,p.engulfMultiplier)===setup.direction;
    if (matchedEngulf) {diagnostics.engulf++;if(b.time<setup.chochTime+120)diagnostics.timingBlocked++;else if(!pathReady)diagnostics.fibBlocked++;else if(!edgeAllowed)diagnostics.edgeBlocked++;}
    if (matchedEngulf && b.time>=setup.chochTime+120 && pathReady && edgeAllowed) {
      const stop=roundTick(setup.direction===1?b.low-p.stopBufferTicks*p.tickSize:b.high+p.stopBufferTicks*p.tickSize,p.tickSize);
      const risk=setup.direction===1?b.close-stop:stop-b.close;
      if (stop>0 && risk>0) {
        const target=roundTick(setup.direction===1?b.close+risk*p.rr:b.close-risk*p.rr,p.tickSize);
        diagnostics.entry++; const event=emit('ENTRY',b,{direction:setup.direction,price:b.close,stop,target,setup:setup.type,fib:setup.fib});
        // The chart uses detection-only mode. An opt-in tester can feed accepted position state back.
        if (options.onEntry?.(event)) state='ENTRY_SIGNAL';
        else {state='EXPECTING_BOS';setup=emptySetup();}
      }
    }
  }
  return {state,setup,events,diagnostics,levels:tracker.snapshot(),params:p};
}
