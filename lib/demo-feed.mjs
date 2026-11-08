// Deterministic synthetic data for UI testing only. These are not market prices.
const settings = { XAUUSD: [2300, 15], EURUSD: [1.08, .008], BTCUSD: [65000, 650] };
export function demoPrice(symbol, time) {
  const [base, swing] = settings[symbol];
  const t = Math.floor(time / 5) * 5;
  return base + swing * (0.48 * Math.sin(t / 7300) + 0.25 * Math.sin(t / 1237) + 0.12 * Math.sin(t / 177) + 0.035 * Math.sin(t / 19) + 0.012 * Math.sin(t / 7));
}
function minute(symbol, time, asOf) {
  const open = demoPrice(symbol, time); let high = open, low = open, close = open;
  for (let t = time + 5; t < time + 60 && t <= asOf; t += 5) { close = demoPrice(symbol, t); high = Math.max(high, close); low = Math.min(low, close); }
  return { time, open, high, low, close, volume: null };
}
export function demoCandles(symbol, timeframe, before, now = Math.floor(Date.now() / 1000)) {
  const interval = timeframe === 'M5' ? 300 : 60;
  const end = Math.floor((before ? Math.min(before - 1, now) : now) / interval) * interval;
  const length = Math.min(500, Math.floor(end / interval) + 1);
  return Array.from({ length }, (_, i) => {
    const time = end - (length - 1 - i) * interval;
    if (interval === 60) return minute(symbol, time, now);
    const parts = Array.from({ length: 5 }, (_, j) => time + j * 60).filter(t => t <= now).map(t => minute(symbol, t, now));
    return { time, open: parts[0].open, high: Math.max(...parts.map(p => p.high)), low: Math.min(...parts.map(p => p.low)), close: parts[parts.length - 1].close, volume: null };
  });
}
