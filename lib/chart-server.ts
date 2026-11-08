import { timingSafeEqual } from 'node:crypto';
export const symbols = { XAUUSD: 'XAU/USD', EURUSD: 'EUR/USD', BTCUSD: 'BTC/USD' } as const;
export const proxies = { XAUUSD: 'PAXGUSDT', EURUSD: null, BTCUSD: 'BTCUSDT' } as const;
export type ChartSymbol = keyof typeof symbols;
export type Source = 'twelvedata' | 'binance' | 'demo';
export function getSymbol(value: string | null): ChartSymbol | null { return value && Object.hasOwn(symbols, value) ? value as ChartSymbol : null; }
// Public demo and Binance fallback never need the paid-provider token.
export function chartAccess(request: Request): Response | null {
  const token = process.env.CHART_ACCESS_TOKEN;
  if (!token) return null;
  if (token.length < 24) return Response.json({ error: 'Chart access token must be at least 24 characters.' }, { status: 503 });
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const a = Buffer.from(supplied), b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: 'Chart access token required for Twelve Data.' }, { status: 401 });
  return null;
}
export function finite(value: unknown): number | null { if (value === null || value === undefined || value === '') return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
export async function twelveData(path: string, params: Record<string, string>) {
  if (!process.env.TWELVE_DATA_API_KEY) throw new Error('Provider not configured');
  const url = new URL(`https://api.twelvedata.com/${path}`);
  Object.entries({ ...params, apikey: process.env.TWELVE_DATA_API_KEY }).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
  const body = await response.json();
  if (!response.ok || body.status === 'error' || body.code) throw new Error('Provider unavailable');
  return body;
}
export async function binance(path: string, params: Record<string, string>) {
  const url = new URL(`https://api.binance.com/api/v3/${path}`);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error('Binance unavailable');
  return response.json();
}
export function sources(request: Request, source: string | null, symbol: ChartSymbol): Source[] {
  if (source) return [source as Source];
  return [...(process.env.TWELVE_DATA_API_KEY && !chartAccess(request) ? ['twelvedata' as const] : []), ...(proxies[symbol] ? ['binance' as const] : []), 'demo'];
}
export function dataHeaders(source: Source, symbol: ChartSymbol) { return { 'Cache-Control':'no-store', 'X-Chart-Source': source, 'X-Chart-Instrument': source === 'binance' ? proxies[symbol]! : source === 'demo' ? `${symbol} SIMULATED` : symbols[symbol] }; }
