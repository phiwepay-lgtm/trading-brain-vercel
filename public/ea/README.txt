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
