// Calculations are on user-provided fields only. No broker validation or inference.
export function numeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
}
function key(value) { return typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s_-]+/g, '') : ''; }
function category(value) {
  switch (key(value)) {
    case 'win': case 'won': case 'fulltp': case 'fulltakeprofit': return 'win';
    case 'loss': case 'lost': case 'stoploss': case 'sl': return 'loss';
    case 'be': case 'breakeven': return 'be';
    default: return 'unknown';
  }
}
export function recordedOutcome(trade) { const outcome = category(trade.outcome); return outcome !== 'unknown' ? outcome : category(trade.status); }
function fullTp(trade) { return ['fulltp','fulltakeprofit'].includes(key(trade.status)) || ['fulltp','fulltakeprofit'].includes(key(trade.outcome)); }
function avg(values) { return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null; }
function pct(n,d) { return d ? n / d * 100 : null; }
export function summarize(trades) {
  const pnl = [], rs = [], winR = [], lossR = [];
  let wins=0, losses=0, be=0, unknown=0, fullTP=0, missingStatus=0, conflicts=0;
  for (const t of trades) {
    const p=numeric(t.pnl), r=numeric(t.realR), result=recordedOutcome(t), fromOutcome=category(t.outcome), fromStatus=category(t.status);
    if (p !== null) pnl.push(p); if (r !== null) rs.push(r);
    if (result==='win') {wins++;if(r!==null)winR.push(r);} else if (result==='loss') {losses++;if(r!==null)lossR.push(r);} else if(result==='be') be++; else unknown++;
    if (fullTp(t)) fullTP++; if (!String(t.status ?? '').trim()) missingStatus++;
    const contradict = (v) => v !== null && ((result==='win' && v<=0) || (result==='loss' && v>=0) || (result==='be' && v!==0));
    if ((fromOutcome!=='unknown' && fromStatus!=='unknown' && fromOutcome!==fromStatus) || contradict(p) || contradict(r)) conflicts++;
  }
  const grossProfit=pnl.filter(x=>x>0).reduce((a,b)=>a+b,0), grossLoss=Math.abs(pnl.filter(x=>x<0).reduce((a,b)=>a+b,0));
  return {count:trades.length,fullTP,wins,losses,be,unknown,missingStatus,conflicts,fullTPRate:pct(fullTP,trades.length),winRate:pct(wins,trades.length),decidedWinRate:pct(wins,wins+losses),beRate:pct(be,trades.length),lossRate:pct(losses,trades.length),totalPnl:pnl.length?pnl.reduce((a,b)=>a+b,0):null,pnlN:pnl.length,totalR:rs.length?rs.reduce((a,b)=>a+b,0):null,rN:rs.length,avgR:avg(rs),avgWinR:avg(winR),winRN:winR.length,avgLossR:avg(lossR),lossRN:lossR.length,grossProfit,grossLoss,profitFactor:pnl.length&&grossLoss>0?grossProfit/grossLoss:null,expectancy:avg(pnl)};
}
function value(raw) { return typeof raw==='string' && raw.trim() && raw.trim()!=='—' ? raw.trim() : null; }
function group(trades, accessor) {
  const map = new Map();
  for (const trade of trades) { const label=accessor(trade);if(!label)continue;const canonical=label.toLowerCase();if(!map.has(canonical))map.set(canonical,{label,trades:[]});map.get(canonical).trades.push(trade); }
  return [...map.values()].map(g=>({label:g.label,...summarize(g.trades)})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
}
export function analyze(trades) {
  const setup=group(trades,t=>value(t.entryType)), exec=group(trades,t=>value(t.exec)), bias=group(trades,t=>value(t.bias));
  const sessionHour=group(trades,t=>{const s=value(t.sess),h=numeric(t.hour);return s && h!==null && Number.isInteger(h) && h>=0 && h<=23 ? `${s} · ${String(h).padStart(2,'0')}:00` : null;});
  const combinations=group(trades,t=>{const a=value(t.entryType), b=value(t.exec);return a&&b?`${a} | ${b}`:null;});
  const best=(groups)=>groups.filter(g=>g.avgR!==null).sort((a,b)=>b.avgR-a.avgR||b.count-a.count||a.label.localeCompare(b.label))[0] ?? null;
  return {summary:summarize(trades),setup,exec,bias,sessionHour,bestCombo:best(combinations),bestHour:best(sessionHour)};
}
