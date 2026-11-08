import { tradeSymbol, tradeTimestamp, type TradeRecord } from './journal';
import { numeric } from './journal-analytics.mjs';
import { classifySetup } from './setup-definitions.mjs';
export type JournalMarker = { id:string; time:number; side:'BUY'|'SELL'; tooltip:string; label:string; color:string; conflict:boolean };
// Journal data never leaves the browser: timestamps are normalized to the UTC bar by the pane.
export function mapJournalMarkers(rows: {trade: TradeRecord; index: number}[], symbol: string): JournalMarker[] {
  const result: JournalMarker[] = [];
  for (const {trade,index} of rows) {
    if (tradeSymbol(trade.symbol ?? trade.pair) !== symbol) continue;
    const classified=classifySetup(trade), side=classified.side;
    const time=tradeTimestamp(trade.openedAt); // Do not infer an entry time from a date-only record.
    if ((side !== 'BUY' && side !== 'SELL') || time === null || time <= 0 || time >= 4102444800) continue;
    const setup=String(trade.entryType ?? trade.setup ?? 'Setup not recorded').slice(0,120);
    const pnl=numeric(trade.pnl), r=numeric(trade.realR), status=String(trade.status || trade.outcome || 'Outcome not recorded').slice(0,80);
    const tooltip=`${classified.label} (recorded label; not pattern-verified) | ${setup} | P/L ${pnl === null ? '—' : pnl.toFixed(2)} (journal units) | ${r === null ? '—' : r.toFixed(2)}R | ${status}`;
    result.push({id:`trade-${index}`,time,side,tooltip,label:classified.label,color:classified.color,conflict:classified.conflict});
  }
  return result;
}
