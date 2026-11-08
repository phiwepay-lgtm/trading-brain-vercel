import { findPivotHA, pivotAt } from './pivots.mjs';

/**
 * Research implementation of the tester draft's independent FTB expectations.
 * Call once per newly completed M5 HA bar, in chronological order. This tracks
 * levels only: it does not identify FTBs, BOSs or entries.
 */
export class ActiveLevelTracker {
  constructor({left = 2, right = 2, lookback = 200} = {}) {
    if (![left, right, lookback].every(Number.isInteger) || left < 1 || right < 1 || lookback < 1) throw new RangeError('Invalid active-level parameters');
    this.left = left; this.right = right; this.lookback = lookback;
    this.high = null; this.low = null; this.seenHigh = null; this.seenLow = null;
    this.observed = 0; this.lastTime = null; this.skipped = 0; this.latestHigh = null; this.latestLow = null;
  }
  update(bars, end = bars.length - 1, known = null) {
    if (!Number.isInteger(end) || end < 0 || end >= bars.length) throw new RangeError('Invalid completed bar');
    const time = bars[end].time;
    if (this.lastTime !== null && time === this.lastTime) return this.snapshot();
    if (this.lastTime !== null && time < this.lastTime) throw new RangeError('Bars must be processed chronologically');
    const adjacent = this.lastTime !== null && end > 0 && bars[end-1].time === this.lastTime;
    if (known) {
      this.latestHigh = known.high || {valid:false}; this.latestLow = known.low || {valid:false};
    } else if (adjacent) {
      const candidate = end - 1 - this.right;
      this.latestHigh = pivotAt(bars, candidate, end - 1, this.left, this.right, true) || this.latestHigh;
      this.latestLow = pivotAt(bars, candidate, end - 1, this.left, this.right, false) || this.latestLow;
    } else {
      this.latestHigh = findPivotHA(bars, end - 1, this.left, this.right, 0, true);
      this.latestLow = findPivotHA(bars, end - 1, this.left, this.right, 0, false);
    }
    const hi = this.latestHigh, lo = this.latestLow;
    this.observed++;
    if (this.lastTime !== null && (end === 0 || bars[end-1].time !== this.lastTime)) {
      this.skipped++; this.high = null; this.low = null;
      this.seenHigh = hi.valid ? hi.time : null; this.seenLow = lo.valid ? lo.time : null;
    }
    this.lastTime = time;
    if (hi?.valid && hi.time !== this.seenHigh) { this.seenHigh = hi.time; this.high = {time: hi.time, value: hi.value, observedAt: this.observed}; }
    if (lo?.valid && lo.time !== this.seenLow) { this.seenLow = lo.time; this.low = {time: lo.time, value: lo.value, observedAt: this.observed}; }
    if (this.high && (this.observed - this.high.observedAt > this.lookback || bars[end].close > this.high.value)) this.high = null;
    if (this.low && (this.observed - this.low.observedAt > this.lookback || bars[end].close < this.low.value)) this.low = null;
    return this.snapshot();
  }
  invalidate(known = {}) {
    this.high=null;this.low=null;this.seenHigh=known.high?.time ?? null;this.seenLow=known.low?.time ?? null;
    this.latestHigh=known.high || {valid:false};this.latestLow=known.low || {valid:false};
  }
  snapshot() { return {high: this.high && {...this.high}, low: this.low && {...this.low}, observed: this.observed, skipped: this.skipped}; }
}
