TRADING BRAIN - SOURCE PACKAGE AND INSTALL GUIDE

SAFETY: These are source files for manual review, not a production trading
system. The EA is uncompiled and broker-untested. Its EnableTrading default is
false and DemoOnly default is true. The current /api/signal returns HOLD, chart
assessments are not signals, and MT5/scanning are not connected. The existing
EA code CAN place orders if explicitly enabled and given a valid BUY/SELL
signal; do not enable it or use a live account. No EX5 file is supplied.

METATRADER 5
1. Place TradingBrain.mq5 in the MT5 data folder under MQL5/Experts (File >
   Open Data Folder). Open it in MetaEditor and compile locally, resolving any
   errors. This creates an EX5 locally; the package does not include one.
2. For review, use a demo account and keep EnableTrading=false, DemoOnly=true,
   and AutoTrading disabled. No signal feed or trading connection is provided.
3. The sample can request the public HOLD endpoint through MT5 WebRequest if
   configured, but it is not an authenticated signal service. Fixed lot sizing
   does not enforce the brain's percentage-risk rule. Do not enable trading
   without independent security, broker, signal and risk-management review.

TRADINGVIEW
1. Open the Pine Editor, paste TradingBrain_GOLD_M1_VLB_VHB.pine, save and add
   it to an M1 GOLD chart. Prices depend on the TradingView data provider.
2. This indicator is a comment-only skeleton. The requested detection, markers,
   FVG zone and statistics table are NOT implemented. It does not detect setups,
   calculate results or place orders. Manually review the intended logic and
   validate any future implementation before relying on it.
3. VLB is for sells after a low break and continuation to a new lower low; VHB
   is for buys after a high break and continuation to a new higher high. M5
   structure confirmation is required. The high/low wording in the requested
   Pine comments needs clarification before automatic detection can be defined.

SYSTEM.JSON AND PRIVACY
When downloaded in the full ZIP, system.json includes only aggregate statistics
calculated locally from the current browser's uploaded journal; it does not
contain individual trade records, screenshots or notes. If no journal is
uploaded, statistics are unavailable. These calculations are descriptive,
unverified journal data, not broker-verified performance or a tested strategy.
The requested 17:00 NY best-hour claim and earlier 14:00-16:00 NY proposal
conflict and are not verified by this app. The Pine comments contain user claims,
not measured results. The R:R slider is hypothetical, not a backtest. Demo and
Binance proxy prices are not live market execution.
