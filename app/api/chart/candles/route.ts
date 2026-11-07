import { chartAccess, finite, getSymbol, symbols, twelveData } from '../../../../lib/chart-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = new URL(request.url), symbol = getSymbol(url.searchParams.get('symbol'));
  const timeframe = url.searchParams.get('timeframe');
  const before = url.searchParams.get('before');
  if (!symbol || !['M1', 'M5'].includes(timeframe ?? '') || (before !== null && (!/^\d{1,10}$/.test(before) || Number(before) < 60 || Number(before) > 4102444800))) return Response.json({ error: 'Invalid symbol, timeframe, or before timestamp.' }, { status: 400 });
  const denied = chartAccess(request); if (denied) return denied;
  const params: Record<string, string> = { symbol: symbols[symbol], interval: timeframe === 'M1' ? '1min' : '5min', outputsize: '500', timezone: 'UTC', order: 'desc' };
  if (before) params.end_date = new Date((Number(before) - 1) * 1000).toISOString().slice(0, 19).replace('T', ' ');
  try {
    const result = await twelveData('time_series', params);
    if (!Array.isArray(result.values)) throw new Error('Invalid provider response');
    const rows = result.values.map((v: Record<string, unknown>) => {
      const rawDate = String(v.datetime ?? '');
      const time = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(rawDate) ? Date.parse(rawDate.replace(' ', 'T') + 'Z') / 1000 : NaN;
      return { time, open: finite(v.open), high: finite(v.high), low: finite(v.low), close: finite(v.close), volume: finite(v.volume) };
    }).filter((v: { time: number; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null }) => Number.isFinite(v.time) && v.open !== null && v.high !== null && v.low !== null && v.close !== null && v.open > 0 && v.low > 0 && v.high >= Math.max(v.open, v.close, v.low) && v.low <= Math.min(v.open, v.close));
    const unique = new Map<number, unknown>(rows.map((v: { time: number }) => [v.time, v]));
    const sorted = [...unique.values()].sort((a: any, b: any) => a.time - b.time);
    if (!sorted.length) throw new Error('No valid candles');
    return Response.json(sorted, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Candle data unavailable. Check provider entitlement, symbol and rate limits.' }, { status: 502 }); }
}
