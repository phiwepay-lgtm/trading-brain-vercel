/** @typedef {{time:number,open:number,high:number,low:number,close:number,volume:number|null}} Bar */
/** @param {Bar[]} bars */
export function heikinAshi(bars) {
  let prior;
  return bars.map(bar => {
    const close = (bar.open + bar.high + bar.low + bar.close) / 4;
    const open = prior ? (prior.open + prior.close) / 2 : (bar.open + bar.close) / 2;
    const out = { ...bar, open, close, high: Math.max(bar.high, open, close), low: Math.min(bar.low, open, close) };
    prior = out;
    return out;
  });
}
/** SMA-seeded EMA of the actual closes. @param {Bar[]} bars @param {number} period */
export function ema(bars, period) {
  if (bars.length < period) return [];
  let value = bars.slice(0, period).reduce((sum, b) => sum + b.close, 0) / period;
  const out = [{ time: bars[period - 1].time, value }];
  for (let i = period; i < bars.length; i++) { value = bars[i].close * (2 / (period + 1)) + value * (1 - 2 / (period + 1)); out.push({ time: bars[i].time, value }); }
  return out;
}
/** A trade-price tick updates one candle; absent volume stays absent. @param {Bar[]} bars @param {{time:number,last:number}} tick @param {number} seconds */
export function applyTick(bars, tick, seconds) {
  if (!bars.length) return bars;
  const time = Math.floor(tick.time / seconds) * seconds;
  const previous = bars[bars.length - 1];
  if (time < previous.time) return bars;
  if (time === previous.time) return [...bars.slice(0, -1), { ...previous, high: Math.max(previous.high, tick.last), low: Math.min(previous.low, tick.last), close: tick.last }];
  return [...bars, { time, open: tick.last, high: tick.last, low: tick.last, close: tick.last, volume: null }];
}
/** @param {Bar[]} older @param {Bar[]} current */
export function mergeBars(older, current) {
  const byTime = new Map(older.map(b => [b.time, b]));
  current.forEach(b => byTime.set(b.time, b));
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
/** Merge a changing M1 candle into the corresponding M5 candle. @param {Bar[]} five @param {Bar} minute */
export function aggregateMinute(five, minute) {
  if (!five.length) return five;
  const time = Math.floor(minute.time / 300) * 300, previous = five[five.length - 1];
  if (time < previous.time) return five;
  if (time === previous.time) return [...five.slice(0, -1), { ...previous, high: Math.max(previous.high, minute.high), low: Math.min(previous.low, minute.low), close: minute.close }];
  return [...five, { ...minute, time }];
}
