import { chartAccess, finite, getSymbol, symbols, proxies, twelveData, binance, sources, dataHeaders, type Source } from '../../../../lib/chart-server';
import { demoCandles } from '../../../../lib/demo-feed.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = new URL(request.url), symbol = getSymbol(url.searchParams.get('symbol'));
  const timeframe = url.searchParams.get('timeframe'), before = url.searchParams.get('before'), source = url.searchParams.get('source');
  if (!symbol || !['M1','M5'].includes(timeframe ?? '') || (source !== null && !['twelvedata','binance','demo'].includes(source)) || (before !== null && (!/^\d{1,10}$/.test(before) || Number(before) < 60 || Number(before) > 4102444800))) return Response.json({error:'Invalid symbol, timeframe, source or before timestamp.'},{status:400});
  if (source === 'twelvedata') { const denied = chartAccess(request); if (denied) return denied; }
  for (const provider of sources(request, source, symbol)) {
    try {
      if (provider === 'demo') return Response.json(demoCandles(symbol,timeframe,before ? Number(before) : null), {headers:dataHeaders(provider,symbol)});
      let rows: any[];
      if (provider === 'binance') {
        if (!proxies[symbol]) throw new Error('No proxy');
        const params: Record<string,string> = {symbol:proxies[symbol]!, interval: timeframe === 'M1' ? '1m' : '5m', limit:'500'};
        if (before) params.endTime = String(Number(before) * 1000 - 1);
        const data = await binance('klines', params); if (!Array.isArray(data)) throw new Error('Invalid data');
        rows = data.map(v => ({time:Number(v[0])/1000, open:finite(v[1]), high:finite(v[2]), low:finite(v[3]), close:finite(v[4]), volume:finite(v[5])}));
      } else {
        const params: Record<string,string> = {symbol:symbols[symbol], interval:timeframe === 'M1' ? '1min' : '5min',outputsize:'500',timezone:'UTC',order:'desc'};
        if (before) params.end_date = new Date((Number(before)-1)*1000).toISOString().slice(0,19).replace('T',' ');
        const data = await twelveData('time_series', params); if (!Array.isArray(data.values)) throw new Error('Invalid data');
        rows = data.values.map((v: Record<string,unknown>) => { const raw = String(v.datetime ?? ''); return {time:/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(raw) ? Date.parse(raw.replace(' ','T')+'Z')/1000 : NaN,open:finite(v.open),high:finite(v.high),low:finite(v.low),close:finite(v.close),volume:finite(v.volume)}; });
      }
      rows = rows.filter(v => Number.isFinite(v.time) && v.open !== null && v.high !== null && v.low !== null && v.close !== null && v.open > 0 && v.low > 0 && v.high >= Math.max(v.open,v.close,v.low) && v.low <= Math.min(v.open,v.close));
      const unique = new Map<number, any>(rows.map(v => [v.time,v]));
      const sorted = [...unique.values()].sort((a,b) => a.time-b.time); if (!sorted.length) throw new Error('No valid candles');
      return Response.json(sorted,{headers:dataHeaders(provider,symbol)});
    } catch { /* Try the next source, unless a source was explicitly requested. */ }
  }
  return Response.json({error:'Requested data source is unavailable.'},{status:502,headers:{'Cache-Control':'no-store'}});
}
