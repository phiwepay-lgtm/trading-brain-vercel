import { chartAccess, finite, getSymbol, symbols, twelveData } from '../../../../lib/chart-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const symbol = getSymbol(new URL(request.url).searchParams.get('symbol'));
  if (!symbol) return Response.json({ error: 'Invalid symbol.' }, { status: 400 });
  const denied = chartAccess(request); if (denied) return denied;
  try {
    const quote = await twelveData('price', { symbol: symbols[symbol] });
    const last = finite(quote.price);
    if (last === null || last <= 0) throw new Error('Missing price');
    // /price does not reliably provide bid/ask or an exchange timestamp.
    return Response.json({ bid: finite(quote.bid), ask: finite(quote.ask), last, observed_at: new Date().toISOString(), source: 'Twelve Data REST snapshot' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Price unavailable. Check provider entitlement and rate limits.' }, { status: 502 }); }
}
