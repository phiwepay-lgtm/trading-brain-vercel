SUPERTREND HEIKIN ASHI — MT5 STRATEGY TESTER RESEARCH DRAFT

STATUS
This is a partial, uncompiled research translation of the user's Supertrend
Pine Script (MPL-2.0: https://mozilla.org/MPL/2.0/). It is not verified against
TradingView or MetaEditor and must not be used live or on demo. MT5 tester only:
the EA refuses initialization outside Strategy Tester. EnableTesterOrders is
false by default. There is no profitability guarantee or evidence of profitability.

WHAT IS INCLUDED
- Runs on one selected symbol and M1 only. Builds synthetic Heikin Ashi OHLC
  from the broker's raw completed M1 bars; no separate HA chart is required for
  the calculations. Closed-bar Supertrend direction changes use Factor=2.5,
  ATR=14 by default. ADX and EMA200 filters are optional, both off by default.
- Dashboard via the chart's Comment text: latest synthetic trend, HA close,
  ATR, Supertrend, ADX, EMA200, latest signal and replay signal count. Dashed
  chart lines show the latest signal's synthetic HA entry, SL, and TP1/2/3.
  These are research levels, not actual fills or a trade history.
- Optional tester orders: fixed lot; one position maximum per symbol, no other
  positions/orders on the symbol; one full position with real broker SL and TP1
  only. TP2 and TP3 are visual levels, not orders or partial exits. The order
  uses the next available broker tick, real bid/ask, and a stop distance based on
  HA ATR. Therefore actual entry, SL and target differ from synthetic HA levels.
- Simple broker volume, tick-size and minimum stop-distance checks. Order
  rejections are printed. This is not a complete execution or risk-safety system.

NOT YET PORTED / IMPORTANT DIFFERENCES
The original Pine script's multi-timeframe and trade-history dashboards,
win-rate and R statistics, zones, colored candles, TP hit marks, diagonal lines,
channels, pivot/key levels, breakout signals, EMA/Supertrend re-entry, visual
labels and alerts are NOT implemented. The tester order exits entirely at TP1;
there are no TP2/TP3 partial fills or re-entry. An existing position/order causes
new signals to be skipped, not reversed. No trades are placed at initialization,
and missed signals during data gaps are not replayed as orders.

HA and Supertrend, ATR and ADX seed and warm-up conventions can differ from
TradingView; bounded replay restarts on each bar and may alter signals as the
window rolls forward. Historical signals, HA-based study prices, order fills and
results are not proven equivalent to the Pine script. Spread, slippage, gaps,
commission, broker trading rules and tester settings affect results. The Pine
script's own TP1-based stats and same-bar ambiguity are not a broker backtest.
This draft should be compared candle-by-candle with the supplied Pine script.
Do not interpret the replay signal count as performance or win rate.

INSTALL / TEST (requires MetaTrader 5 on your computer or VPS)
1. In MT5 choose File > Open Data Folder. Copy the contents of this package's
   MQL5/Experts folder into MQL5/Experts/ and the MQL5/Scripts folder into
   MQL5/Scripts/. Both SupertrendHA_Tester.mq5 and STCore.mqh must be together.
2. Open SupertrendHA_Tester.mq5 in MetaEditor and Compile (F7). Compile the
   template helper separately. If errors appear, send the full Errors tab;
   no MetaEditor compiler is available in this workspace.
3. In Strategy Tester choose the compiled EA, your symbol and M1; use a suitable
   period with sufficient earlier M1 history (at least 500 completed bars). Choose
   Every tick based on real ticks where available and enable Visual mode. First
   leave EnableTesterOrders=false to inspect the dashboard and study levels.
4. To simulate orders, rerun with EnableTesterOrders=true and a valid fixed Lots
   value. Trades are simulated by Strategy Tester only, with full TP1 exit.
   Review journal errors and tester reports, spread, commissions and drawdown.

HEIKIN ASHI DISPLAY / TEMPLATE
The EA always calculates its own synthetic HA and works on a normal M1 chart.
For a visible HA overlay, attach MT5's Heiken Ashi indicator (if available) to a normal chart,
choose your colors and layout, then drag Create_Supertrend_HA_Template onto the
chart. It calls ChartSaveTemplate to create SupertrendHA_Research.tpl (and will
overwrite a template with that name). Templates may also save any EA already
attached to the source chart; use a chart without an EA to avoid including it.
The helper doesn't attach an EA and does
not itself draw the EA dashboard: the tester EA displays that when running.
Alternatively save the chart yourself with MT5's Templates menu. To use your
layout as the tester template, explicitly save/rename a copy as tester.tpl in
MT5's profiles/templates folder; back up any existing tester.tpl first. A template
is not an executable indicator and must not be assumed portable without testing.
The helper and generated template have not been compiled or tested here.

FILES
MQL5/Experts/SupertrendHA_Tester.mq5 — tester-only EA and on-chart dashboard
MQL5/Experts/STCore.mqh — shared HA/Supertrend/ATR/ADX implementation
MQL5/Scripts/Create_Supertrend_HA_Template.mq5 — MT5 template-save helper
