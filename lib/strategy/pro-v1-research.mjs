import {replayResearch, defaultResearchParams} from './research.mjs';
import {buildM5, historyQuality} from './history.mjs';
import {IndependentPositionLedger} from './pro-v1-ledger.mjs';

/**
 * Experimental independent-position replay, not platform parity or a broker
 * backtest. The inherited detector remains provisional. Outcomes use M1 OHLC,
 * omit costs, and censor gaps and same-bar double touches. Never tune signal
 * gates simply to force a desired trade count.
 */
export function runProV1Research(m1, params={}, {startTime=null,endTime=null}={}) {
  if ((startTime!==null && !Number.isSafeInteger(startTime)) ||
      (endTime!==null && !Number.isSafeInteger(endTime)) ||
      (startTime!==null && endTime!==null && startTime>=endTime)) throw new Error('Invalid test range');
  const history=endTime===null ? m1 : m1.filter(b=>b.time<endTime);
  if (!history.length || (startTime!==null && !history.some(b=>b.time>=startTime))) throw new Error('No candles in test range');
  const p={...defaultResearchParams,...params};
  const {bars:m5,incomplete}=buildM5(history);
  const ledger=new IndependentPositionLedger();
  const replay=replayResearch(history,m5,p,{
    // The user confirmed that BT requires the earlier fib reaction, but not a
    // separate proximity test at the later engulfing entry.
    startTime,resetOnGap:true,btEntryProximity:false,
    onBar:bar=>{ledger.advance(bar);return {open:false,closed:false};},
    // Return false to reset the detector after a candidate, not to reject it
    // from the independent ledger. No position-state suppression is applied.
    onEntry:event=>{ledger.enter(event);return false;}
  });
  return {
    quality:{...historyQuality(history),m5:m5.length,incompleteM5:incomplete},
    replay,
    positions:{closed:ledger.closed,censored:ledger.censored,open:ledger.open,invalidSignals:ledger.invalidSignals},
    assumptions:{startTime,endTime,model:'independent close-entry OHLC; no trading costs',ambiguousExit:'censored',gap:'censored'}
  };
}
