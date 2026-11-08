import { chartAccess, finite, getSymbol, symbols, proxies, twelveData, binance, sources, dataHeaders } from '../../../../lib/chart-server';
import { demoPrice } from '../../../../lib/demo-feed.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = new URL(request.url), symbol = getSymbol(url.searchParams.get('symbol')), source = url.searchParams.get('source');
  if (!symbol || (source !== null && !['twelvedata','binance','demo'].includes(source))) return Response.json({error:'Invalid symbol or source.'},{status:400});
  if (source === 'twelvedata') { const denied = chartAccess(request); if (denied) return denied; }
  for (const provider of sources(request,source,symbol)) {
    try {
      let last: number | null = null, bid: number | null = null, ask: number | null = null;
      const time = Math.floor(Date.now()/1000/5)*5;
      if (provider === 'demo') last = demoPrice(symbol,time);
      else if (provider === 'binance') { if (!proxies[symbol]) throw new Error(); const [p,b] = await Promise.all([binance('ticker/price',{symbol:proxies[symbol]!}), binance('ticker/bookTicker',{symbol:proxies[symbol]!})]); last = finite(p.price); bid = finite(b.bidPrice); ask = finite(b.askPrice); }
      else { const p = await twelveData('price',{symbol:symbols[symbol]}); last = finite(p.price); bid = finite(p.bid); ask = finite(p.ask); }
      if (last === null || last <= 0) throw new Error('Invalid price');
      return Response.json({bid,ask,last,time,source:provider,instrument:dataHeaders(provider,symbol)['X-Chart-Instrument'],is_demo:provider==='demo',observed_at:new Date().toISOString()},{headers:dataHeaders(provider,symbol)});
    } catch { /* Fall back unless explicitly requested. */ }
  }
  return Response.json({error:'Requested price source is unavailable.'},{status:502,headers:{'Cache-Control':'no-store'}});
}
