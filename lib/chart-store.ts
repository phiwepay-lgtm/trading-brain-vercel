import { create } from 'zustand';
import type { Bar } from '../app/chart/pane';

type ChartData = {
  m1: Bar[];
  m5: Bar[];
  setBars: (timeframe: 'M1' | 'M5', bars: Bar[]) => void;
};
/** In-memory only. Provider candles and journal data are not persisted by this store. */
export const useChartData = create<ChartData>(set => ({
  m1: [], m5: [],
  setBars: (timeframe, bars) => set(timeframe === 'M1' ? {m1: bars} : {m5: bars}),
}));
