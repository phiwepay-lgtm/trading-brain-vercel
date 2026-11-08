TRADING BRAIN - M5/M1 VISUAL SCANNER SOURCE PACKAGE

SAFETY: The MT5 EA and Pine indicator are disabled by default. Their M1
markers are visual candidate annotations only, not verified signals or advice.
The EA contains no order-submission or network functions. No EX5 is supplied.
Neither file has been compiled or tested in MT5 or TradingView here. The app's
/api/signal remains HOLD and the website is not connected to MT5.

METATRADER 5
1. Copy TradingBrain.mq5 to MQL5/Experts (File > Open Data Folder), open in
   MetaEditor and compile. Resolve errors; EX5 is created locally, not supplied.
2. Open a demo M1 chart and attach the EA. Enable_Visual_Scanner=false by
   default. If you choose to inspect visual candidates, turn it on manually;
   Use_M5_Filter defaults to true. No WebRequest or AutoTrading is required.
3. It backfills up to 500 M1 bars by default, then updates on each new M1 bar.
   The M5 zones are outlined rectangles; MT5 object alpha varies by terminal.
   Deleting the EA removes its own chart objects. Test with your broker feed.

TRADINGVIEW
1. Paste TradingBrain_GOLD_M1_VLB_VHB.pine into Pine Editor, save and add to
   an M1 chart. Enable_Visual_Scanner=false by default; turn it on only for
   manual visual review. Use_M5_Filter=true aligns candidates by default.
2. Red VLB? and green VHB? triangles are candidates, not confirmed patterns.
   The top-right panel shows M5 bias, proxy setup/level, M1 candidate/HOLD,
   filter status and a fixed user claim of 40 trades/PF 4.76/WR 27.5%. The
   latter is NOT read from the journal, calculated or independently verified.
3. On other timeframes or with the scanner disabled, no markers/zones appear.
   Without enough history or when the completed M5 range is zero the filter
   holds; if the M5 filter is manually disabled it can show unfiltered M1
   candidates. Nothing in either source places orders or performs a backtest.

WHAT THE HEURISTIC DOES
At each M1 bar, use the previous completed M5 bar and the high/low of the
last M5_Len (default 50) closed M5 candles as available at the M1 bar open.
BT level = high - 0.382*range, FTB level = low + 0.382*range. The preceding
M5 close above BT labels the range bearish; below FTB labels it bullish;
otherwise neutral. Setup names are USER-REQUESTED PROXIES ONLY: this does not
establish an actual break-test or failure-to-break. Levels and bias are based
on the feed's OHLC; no FVG or actual 0.382 zone is detected. The displayed
bands use a configurable arbitrary tick/point half-width and are not stops.

On a confirmed M1 close, a bearish body engulfing the previous bullish body
at or above the previous M1_Len (default 5) bars' high is a VLB? sell
candidate; bullish engulfing at or below the preceding low is a VHB? buy
candidate. Equal body edges are accepted. M1 bars must be contiguous. With
the M5 filter on, only bearish candidates with bearish M5 bias or bullish
candidates with bullish M5 bias are shown; neutral or missing M5 holds.
Filter-off candidates are NOT M5-confirmed. Settings and historical bars
can differ across providers/platforms. This simplified heuristic does NOT
verify M5 structure, M1 BOS/CHoCH, pullback, the earlier clarified new lower
low/new higher high, engulfing interpretation, or an actual BT/FTB sequence.
Those rules remain user-provided and need a precise independent definition.
Price data and intrabar history can change; visually review and test first.

SYSTEM.JSON AND PRIVACY
The full ZIP includes only aggregate statistics calculated locally from the
current browser's uploaded journal, not individual records, screenshots or
notes. With no journal the statistics are unavailable. They are descriptive,
unverified journal data, not brokerage performance or a tested strategy. The
17:00 NY best-hour claim conflicts with the earlier proposed 14:00-16:00 NY
filter; neither is verified. The R:R slider is hypothetical, not a backtest.
Demo and Binance proxy prices are not live market execution.

PR12 LEGACY PROXY TRADINGVIEW STRATEGY (SIMULATED ONLY)
1. Paste TradingBrain_Strategy.pine into Pine Editor, save and add to an M1
   GOLD chart. The PR11 indicator is unchanged. Enable_Backtest is false by
   default. Turn it on only for research after reviewing the code. Set UTC
   Start/End dates and signal-bar quarter; the defaults cover 2024 and 2025 only.
2. TradingView's Strategy Tester reports simulated trades for the selected
   date/signal-quarter range. The bottom-left custom table shows closed-trade
   totals, win rate, PF, closed-equity DD, gross price R, and Q1-Q4 PF grouped
   by EXIT quarter in UTC across years. The quarter input filters SIGNAL bars;
   existing trades can close outside the selected dates or signal quarter.
   Quarterly breakdown is in the script's table, NOT the native Performance
   Summary. Show Last 500 affects ONLY the custom table, not native Strategy
   Tester metrics or simulated orders. If fewer than 500 closed trades exist,
   it displays all available. The script does not guarantee 500 trades.
3. Custom PF/wins/DD use TradingView's strategy.closedtrades.profit values;
   check its cost semantics against the Strategy Tester. The closed-only DD
   ignores open/intrabar equity drawdown and may differ from native max DD.
   Avg R uses price movement from the actual fill divided by distance to the
   stop set at signal time, before commission; cases where a gap places the
   fill through the stop are excluded, and the valid denominator is shown.
   There is no profit factor when no losses exist. Backtest results are not
   verified journal statistics and do not prove real-world performance.
4. The stop is the signal bar's extreme plus/minus a configurable tick buffer;
   the target is RR times the signal close-to-stop distance, with simulated
   quantity configurable. Market orders normally fill on the next available
   tick. Gaps, slippage, 0.02% commission per order, data quality, position
   sizing, exchange rules and historical fill assumptions affect results.
   The actual fill can differ from signal close or cross the bracket. Exit
   orders remain active after the date/quarter window. TradingView may limit
   accessible history and number of strategy orders.

TRADINGVIEW ALERTS / FUTURE BRIDGE GUIDE
NO BRIDGE OR LIVE AUTOMATION IS PROVIDED. PR11 TradingBrain.mq5 has no
WebRequest, file receiver or order code. A separate authenticated, replay-safe
relay and independently reviewed MT5 receiver are required for any future
integration. The JSON alerts are untrusted simulated candidate notifications,
not broker fills or trade instructions; do not forward them to a live account.

To inspect messages only: enable Enable_Backtest and Enable_Alerts on an M1
chart, then create a TradingView strategy alert for "alert() function calls
only". The strategy's alertcondition() declarations do NOT fire in strategy
scripts. alert() emits the dynamic bias/symbol/price JSON at signal close on
realtime bars, before any simulated fill; it does not issue historical alerts.
If your TradingView plan supports webhooks, an HTTPS request inspection service
such as webhook.site can receive TEST payloads, but third parties may store
the message. Do not send private data or credentials. A capture URL is not an
MT5 bridge, and webhook.site is not a secure trade relay. A file-based bridge
would likewise need a separate service to authenticate, validate, deduplicate
and write messages and a separate MT5 reader; neither component exists here.

V14 M5/M1 STRUCTURE DRAFT (SEPARATE DOWNLOAD, NOT IN THIS ZIP)
TradingBrain_M5_M1_v14.pine is available separately from the Download Center.
It is disabled by default and uses provisional confirmed M5/M1 pivots, an
M5 breakout, candidate 0.382 touch and M1 CHoCH/engulfing sequence. Bearish
M5 uses synthetic Heikin Ashi data; bullish M5 uses normal data provisionally.
Sessions, pivots and identification of bearish anchors require confirmation. No rules have been
validated against the 40 records or compiled in TradingView. It uses standard
M1 bars only, contains no MT5 bridge and makes no profitability claims.

V15 BT / FTB STUDY (SEPARATE DOWNLOAD, NOT IN THIS ZIP)
TradingBrain_M5_M1_v15.pine is disabled by default and uses completed M5
Heikin Ashi for both directions. FTB candidates go directly to M1 CHoCH
without the BT 0.382 gate. Pivot/colour choices, sessions and swing anchors
need confirmation. Pine compilation and backtesting have not been verified.

MT5 V15.3 STRATEGY TESTER KIT (SEPARATE SOURCE PACKAGE)
TradingBrain-MT5-v153-Tester.zip contains an uncompiled tester-only EA,
six disabled .set input presets, and an MT5 Strategy Tester guide. It is a
research translation, NOT verified equivalent to the Pine draft; fills, data,
HA initialization, pivots and session clocks can differ. Compile in MetaEditor
on your own computer. The EA cannot run live/demo, and both simulation and
tester orders require explicit opt-in. The preset files are not chart .tpl
files; create a chart template in MT5 as described in the guide. Broker history
and real-tick coverage vary and no trade count or performance is guaranteed.
