/** A pivot's right-side candles must all be included in `end`. */
export function pivotAt(bars, i, end, left, right, isHigh) {
  if (i < left || i + right > end) return null;
  const value = isHigh ? bars[i].high : bars[i].low;
  let valid = Number.isFinite(value);
  for (let j = 1; j <= left && valid; j++) valid = isHigh ? value > bars[i-j].high : value < bars[i-j].low;
  for (let j = 1; j <= right && valid; j++) valid = isHigh ? value >= bars[i+j].high : value <= bars[i+j].low;
  return valid ? {valid:true,index:i,time:bars[i].time,value} : null;
}
/** Confirmed fractal pivots over a chronological array. `end` is the last completed bar index. */
export function findPivot(bars, end, left = 2, right = 2, rank = 0, isHigh = true) {
  if (!Number.isInteger(end) || end < -1 || end >= bars.length || !Number.isInteger(left) || left < 1 || !Number.isInteger(right) || right < 1 || !Number.isInteger(rank) || rank < 0) throw new RangeError('Invalid pivot arguments');
  for (let i = end - right; i >= left; i--) {
    const pivot = pivotAt(bars, i, end, left, right, isHigh);
    if (pivot && rank-- === 0) return pivot;
  }
  return {valid: false, index: -1, time: null, value: null};
}
export const findPivotHA = findPivot;
export const findPivotM1 = findPivot;
/** All pivots confirmed by `end`, sorted by their original candle, not confirmation time. */
export function confirmedPivots(bars, end, left = 2, right = 2, isHigh = true) {
  if (!Number.isInteger(end) || end < -1 || end >= bars.length || !Number.isInteger(left) || left < 1 || !Number.isInteger(right) || right < 1) throw new RangeError('Invalid pivot arguments');
  const result = [];
  for (let i = left; i + right <= end; i++) {
    const pivot = pivotAt(bars, i, end, left, right, isHigh);
    if (pivot) result.push({...pivot,confirmedAt:bars[i+right].time});
  }
  return result;
}
