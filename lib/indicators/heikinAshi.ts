import { heikinAshi } from '../chart-math.mjs';

export type OHLCVBar = { time: number; open: number; high: number; low: number; close: number; volume: number | null };
/** Uses the shared chart recurrence. The first bar is seeded from its raw open and close. */
export function calculateHeikinAshi<T extends OHLCVBar>(bars: T[]): T[] {
  return heikinAshi(bars) as T[];
}
