import { numeric } from './journal-analytics.mjs';
const key = value => typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s_-]+/g,'') : '';
function category(value) {
  switch(key(value)) {
    case 'fulltp': case 'fulltakeprofit': return {kind:'tp', explicit:true};
    case 'stoploss': case 'sl': return {kind:'sl', explicit:true};
    case 'be': case 'breakeven': return {kind:'be', explicit:true};
    case 'win': case 'won': return {kind:'tp', explicit:false};
    case 'loss': case 'lost': return {kind:'sl', explicit:false};
    default: return null;
  }
}
// A generic win/loss does not prove Full TP or a 1R stop. Contradictory labels are excluded.
export function scenarioCounts(trades) {
  const result = {total:trades.length, tp:0, sl:0, be:0, unclassified:0, conflictingLabels:0, inconsistentValues:0};
  for (const trade of trades) {
    const status=category(trade.status), outcome=category(trade.outcome);
    if (status && outcome && status.kind !== outcome.kind) { result.conflictingLabels++; continue; }
    const chosen = status?.explicit ? status : outcome?.explicit ? outcome : null;
    if (!chosen) { result.unclassified++; continue; }
    result[chosen.kind]++;
    const p=numeric(trade.pnl), r=numeric(trade.realR);
    const mismatch = v => v !== null && ((chosen.kind === 'tp' && v <= 0) || (chosen.kind === 'sl' && v >= 0) || (chosen.kind === 'be' && v !== 0));
    if (mismatch(p) || mismatch(r)) result.inconsistentValues++;
  }
  return {...result,included:result.tp+result.sl+result.be};
}
export function scenario(trades, ratio) {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 2 || ratio > 7) throw new RangeError('R:R must be between 2 and 7.');
  const c=scenarioCounts(trades);
  return {...c,ratio,totalR:c.included ? c.tp*ratio-c.sl : null,breakEvenWinRate:100/(1+ratio),bestRatio:c.included && c.tp > 0 ? 7 : null,allRatiosTie:c.included > 0 && c.tp === 0};
}
