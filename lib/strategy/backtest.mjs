/**
 * Simple OHLC candidate simulator, deliberately not an MT5/TradingView emulator.
 * Entry at signal close, one position at a time; only later M1 bars can exit.
 * Gaps execute at the next open; when both levels are touched in a bar, stop wins.
 * Positions spanning a missing M1 interval are censored, not counted as trades.
 * No spread, commissions, slippage, account sizing, margin or intrabar path.
 */
export function simulateCandidates(m1, events) {
  const entries=new Map();
  for (const e of events) if (e.kind==='ENTRY') entries.set(e.time,e);
  const trades=[], censored=[]; let position=null, skipped=0, invalid=0, previousTime=null;
  for (const bar of m1) {
    if (position && previousTime !== null && bar.time-previousTime !== 60) { censored.push({...position,reason:'missing M1 interval',lastTime:previousTime});position=null; }
    previousTime=bar.time;
    if (position && bar.time>position.time) {
      const {direction,stop,target,price}=position;
      let exit=null, reason=null;
      if ((direction===1 && bar.open<=stop) || (direction===-1 && bar.open>=stop)) {exit=bar.open;reason='stop gap';}
      else if ((direction===1 && bar.open>=target) || (direction===-1 && bar.open<=target)) {exit=bar.open;reason='target gap';}
      else if ((direction===1 && bar.low<=stop) || (direction===-1 && bar.high>=stop)) {exit=stop;reason='stop';}
      else if ((direction===1 && bar.high>=target) || (direction===-1 && bar.low<=target)) {exit=target;reason='target';}
      if (exit!==null) {
        const risk=Math.abs(price-stop), r=direction*(exit-price)/risk;
        trades.push({...position,exitTime:bar.time,exit,reason,r}); position=null;
      }
    }
    const signal=entries.get(bar.time);
    if (!signal) continue;
    if (position) {skipped++;continue;}
    const {direction,price,stop,target}=signal;
    if (![price,stop,target].every(x=>Number.isFinite(x) && x>0) || (direction===1 && !(stop<price && target>price)) || (direction===-1 && !(stop>price && target<price)) || ![1,-1].includes(direction)) {invalid++;continue;}
    position={...signal};
  }
  let equity=0, peak=0, maxDrawdown=0, wins=0, losses=0, breakeven=0, grossWin=0, grossLoss=0;
  const curve=[0];
  for (const t of trades) {
    equity+=t.r;peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,peak-equity);curve.push(equity);
    if (t.r>0) {wins++;grossWin+=t.r;} else if(t.r<0) {losses++;grossLoss-=t.r;} else breakeven++;
  }
  return {trades,censored,open:position,skipped,invalid,equity,curve,wins,losses,breakeven,maxDrawdown,profitFactor:grossLoss>0?grossWin/grossLoss:null};
}
