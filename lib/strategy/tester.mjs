import { replayResearch, defaultResearchParams } from './research.mjs';
import { buildM5, historyQuality } from './history.mjs';

/** Position-aware, close-entry OHLC research simulator; not a broker emulator. */
export function runResearchTester(m1, params={}, options={}) {
  const p={...defaultResearchParams,...params};
  const {startTime=null,endTime=null,feePercent=0,spreadTicks=0,slippageTicks=0}=options;
  if (![feePercent,spreadTicks,slippageTicks].every(x=>Number.isFinite(x)&&x>=0) || feePercent>100 || spreadTicks>100000 || slippageTicks>100000 || (startTime!==null && !Number.isSafeInteger(startTime)) || (endTime!==null && !Number.isSafeInteger(endTime)) || (startTime!==null && endTime!==null && startTime>=endTime)) throw new Error('Invalid test range or cost assumptions');
  const history=endTime===null?m1:m1.filter(b=>b.time<endTime);
  if(!history.length) throw new Error('No candles before the selected end date');
  if(startTime!==null && !history.some(b=>b.time>=startTime)) throw new Error('No candles within the selected test range');
  const {bars:m5,incomplete}=buildM5(history), quality=historyQuality(history), trades=[], censored=[];
  let position=null, previousTime=null, invalid=0;
  const adverse=(spreadTicks/2+slippageTicks)*p.tickSize;
  function onBar(bar) {
    const lastObservedTime=previousTime;
    const gap=lastObservedTime!==null && bar.time-lastObservedTime!==60;previousTime=bar.time;
    if (gap && position) {censored.push({...position,lastTime:lastObservedTime,gapObservedAt:bar.time,reason:'missing M1 interval'});position=null;return {closed:true};}
    if (!position || bar.time<=position.time) return {open:!!position};
    const {direction,stop,target,entryFill,signalRisk}=position;
    let raw=null,reason=null;
    if ((direction===1 && bar.open<=stop)||(direction===-1 && bar.open>=stop)) {raw=bar.open;reason='stop gap';}
    else if ((direction===1 && bar.open>=target)||(direction===-1 && bar.open<=target)) {raw=bar.open;reason='target gap';}
    else if ((direction===1 && bar.low<=stop)||(direction===-1 && bar.high>=stop)) {raw=stop;reason='stop';}
    else if ((direction===1 && bar.high>=target)||(direction===-1 && bar.low<=target)) {raw=target;reason='target';}
    if (raw!==null) {
      const exit=raw-direction*adverse;
      if (!Number.isFinite(exit) || exit<=0) {censored.push({...position,lastTime:bar.time,reason:'nonpositive exit fill under cost assumptions'});position=null;return {closed:true};}
      const gross=direction*(exit-entryFill), fee=(entryFill+exit)*feePercent/100;
      const net=gross-fee;
      trades.push({...position,exitTime:bar.time,exit,reason,gross,fee,net,r:net/signalRisk});position=null;return {closed:true};
    }
    return {open:true};
  }
  function onEntry(event) {
    const {direction,price,stop,target}=event, entryFill=price+direction*adverse, signalRisk=Math.abs(price-stop);
    if (![entryFill,price,stop,target,signalRisk].every(x=>Number.isFinite(x)&&x>0) || (direction===1 && !(stop<entryFill && target>entryFill)) || (direction===-1 && !(stop>entryFill && target<entryFill))) {invalid++;return false;}
    position={...event,entryFill,signalRisk};return true;
  }
  const replay=replayResearch(history,m5,p,{startTime,onBar,onEntry,resetOnGap:true});
  let equity=0,peak=0,maxDrawdown=0,wins=0,losses=0,breakeven=0,grossWin=0,grossLoss=0;
  const curve=[0];
  for(const t of trades){equity+=t.r;peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,peak-equity);curve.push(equity);if(t.r>0){wins++;grossWin+=t.r;}else if(t.r<0){losses++;grossLoss-=t.r;}else breakeven++;}
  return {quality:{...quality,m5:m5.length,incompleteM5:incomplete},replay,trades,censored,open:position,invalid,metrics:{equity,curve,maxDrawdown,wins,losses,breakeven,profitFactor:grossLoss>0?grossWin/grossLoss:null},assumptions:{startTime,endTime,feePercent,spreadTicks,slippageTicks}};
}
