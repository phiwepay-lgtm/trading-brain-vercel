import { findPivot as find, confirmedPivots as all } from './pivots.mjs';
import type { OHLCVBar } from './heikinAshi';

export type Pivot = {valid: boolean; index: number; time: number | null; value: number | null};
export function findPivotHA(bars: OHLCVBar[], end: number, left = 2, right = 2, rank = 0, isHigh = true): Pivot {
  return find(bars, end, left, right, rank, isHigh);
}
export const findPivotM1 = findPivotHA;
export function confirmedPivots(bars: OHLCVBar[], end: number, left = 2, right = 2, isHigh = true): (Pivot & {confirmedAt: number})[] {
  return all(bars, end, left, right, isHigh);
}
