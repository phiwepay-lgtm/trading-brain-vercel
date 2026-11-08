import { recordedOutcome, numeric } from './journal-analytics.mjs';
export const FILTER_KEY = 'trading-brain-journal-filters-v1';
export const emptyFilters = () => ({search:'',outcome:'all',entryType:'',exec:'',bias:'',sess:'',hour:''});
export function cleanFilters(value) {
  const result=emptyFilters(); if (!value || typeof value!=='object') return result;
  for(const k of ['search','entryType','exec','bias','sess','hour']) if(typeof value[k]==='string') result[k]=value[k].slice(0,200);
  if(['all','win','loss','be','unknown'].includes(value.outcome))result.outcome=value.outcome;
  return result;
}
const same = (a,b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
export function filterTrades(trades, raw) {
  const f=cleanFilters(raw), q=f.search.trim().toLowerCase();
  return trades.map((trade,index)=>({trade,index})).filter(({trade:t}) => {
    if (q && ![t.symbol,t.pair,t.entryType,t.setup,t.exec].some(v=>String(v??'').toLowerCase().includes(q))) return false;
    if (f.outcome !== 'all' && recordedOutcome(t)!==f.outcome) return false;
    for (const k of ['entryType','exec','bias','sess']) if (f[k] && !same(t[k],f[k])) return false;
    if (f.hour && numeric(t.hour)!==numeric(f.hour)) return false;
    return true;
  });
}
