export interface IndicatorCardItem {
  name: string;
  tag: string;
  href: string;
  note: string;
}

// Every indicator in this project: the standalone Dark Orders overlay, the
// combined scripts, and the MT5 research tools.
export const indicators: IndicatorCardItem[] = [
  { name: 'Dark Orders — Pure Price + History', tag: 'TRADINGVIEW · PINE V5', href: '/', note: 'A price-only overlay highlighting unusual candle expansion, with a recent-signal recap.' },
  { name: 'All In One', tag: 'ONE SCRIPT / FOUR STUDIES', href: '/all-in-one', note: 'Dark Orders, the Trend Predictor anchor, My Session Range and the NQ volume profile in one TradingView script.' },
  { name: 'Trend Predictor', tag: 'TRADINGVIEW · PINE V6', href: '/trend-predictor', note: 'An anchor-only adaptation of the Rolling Candle Profile with a chart VWAP and a volume-weighted EMA blend.' },
  { name: 'My Session Range', tag: 'TRADINGVIEW · PINE V6', href: '/session-range', note: 'Developing session high/low; Pine v6 and Indie v5 drafts.' },
  { name: 'NQ Developing Volume Profile', tag: 'TRADINGVIEW · PINE V6', href: '/nq-volume-profile', note: 'Developing window from 16:00 to 16:00 New York; Pine v6 and Indie v5 drafts.' },
  { name: 'Supertrend HA Tester', tag: 'METATRADER 5 · TESTER ONLY', href: '/supertrend-tester', note: 'Source-only M1 Heikin Ashi research EA with an opt-in tester order.' },
  { name: 'Two In One', tag: 'TRADINGVIEW · PINE V6', href: '/two-in-one', note: 'Dark Orders plus an Indie v5 draft; the two calculations stay separate.' },
];
