export type TradeRecord = Record<string, unknown>;
export const JOURNAL_KEY = 'trading-brain-journal-v1';
export const MAX_JOURNAL_BYTES = 4_000_000;
export function extractTrades(value: unknown): TradeRecord[] {
  let trades: unknown = Array.isArray(value) ? value : value && typeof value === 'object' ? (value as any).trades : null;
  if (typeof trades === 'string') { try { trades = JSON.parse(trades); } catch { throw new Error('The trades field is not valid JSON.'); } }
  if (!Array.isArray(trades) || trades.length > 10000 || trades.some(t => !t || typeof t !== 'object' || Array.isArray(t))) throw new Error('Expected an array of up to 10,000 trade objects, or an object containing trades.');
  return trades as TradeRecord[];
}
export function tradeSymbol(value: unknown): 'XAUUSD' | 'EURUSD' | 'BTCUSD' | null {
  const s = String(value ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  if (s.includes('XAUUSD') || s === 'GOLD') return 'XAUUSD'; if (s.includes('EURUSD')) return 'EURUSD'; if (s.includes('BTCUSD')) return 'BTCUSD'; return null;
}
export function tradeTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value > 1e12 ? value / 1000 : value);
  if (typeof value === 'string' && /^\d{10,13}$/.test(value)) return tradeTimestamp(Number(value));
  if (typeof value !== 'string' || !/(Z|[+-]\d\d:\d\d)$/i.test(value)) return null;
  const ms = Date.parse(value); return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}
export function tradeFocus(trade: TradeRecord): {time: number; approximate: boolean} | null {
  const time = tradeTimestamp(trade.entry_time ?? trade.entryTime ?? trade.open_time ?? trade.openTime ?? trade.openedAt);
  if (time && time > 0 && time < 4102444800) return {time,approximate:false};
  const date = trade.date;
  if (typeof date === 'string' && /^\d{4}-\d\d-\d\d$/.test(date)) { const t = Date.parse(date+'T00:00:00Z')/1000; if (Number.isFinite(t) && t > 0 && t < 4102444800 && new Date(t*1000).toISOString().slice(0,10) === date) return {time:t,approximate:true}; }
  return null;
}
