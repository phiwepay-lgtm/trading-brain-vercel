import { timingSafeEqual } from 'node:crypto';

export const symbols = { XAUUSD: 'XAU/USD', EURUSD: 'EUR/USD', BTCUSD: 'BTC/USD' } as const;
export type ChartSymbol = keyof typeof symbols;
export function getSymbol(value: string | null): ChartSymbol | null {
  return value && Object.hasOwn(symbols, value) ? value as ChartSymbol : null;
}
export function chartAccess(request: Request): Response | null {
  const token = process.env.CHART_ACCESS_TOKEN;
  if (!process.env.TWELVE_DATA_API_KEY || !token || token.length < 24) {
    return Response.json({ error: 'Market data is not configured. Set TWELVE_DATA_API_KEY and a CHART_ACCESS_TOKEN of at least 24 characters on the server.' }, { status: 503 });
  }
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const a = Buffer.from(supplied), b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: 'Chart access token required.' }, { status: 401 });
  return null;
}
export function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export async function twelveData(path: string, params: Record<string, string>) {
  const url = new URL(`https://api.twelvedata.com/${path}`);
  Object.entries({ ...params, apikey: process.env.TWELVE_DATA_API_KEY! }).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
  const body = await response.json();
  if (!response.ok || body.status === 'error' || body.code) throw new Error('Provider unavailable or instrument not entitled');
  return body;
}
