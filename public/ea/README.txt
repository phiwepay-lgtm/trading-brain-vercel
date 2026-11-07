TRADING BRAIN - MT5 EA INSTALL GUIDE

IMPORTANT: This is an unverified sample EA, not a production-ready trading system.
The current /api/signal endpoint always returns HOLD. Chart image assessments do
not feed the EA. MT5, scanning, trades and signal generation are not connected.
The source has not been compiled or broker-tested in this environment.

1. Download TradingBrain.mq5 and place it in your MT5 Data Folder under
   MQL5/Experts (in MT5: File > Open Data Folder).
2. Open MetaEditor, open TradingBrain.mq5, and compile. Resolve any errors before
   continuing. The .ex5 executable is created locally; no executable is provided.
3. In MT5: Tools > Options > Expert Advisors > Allow WebRequest for listed URL.
   Add https://trading-brain-vercel.vercel.app (the origin, not /api/signal).
4. Restart or refresh the Navigator. Attach TradingBrain to a DEMO chart matching
   the exact broker symbol and enable AutoTrading only after reviewing the code.
5. Defaults are Lots=0.1, Magic=12345, EnableTrading=false, DemoOnly=true.
   EnableTrading must be set true explicitly before any order can be sent. Keep
   DemoOnly=true. Fixed Lots do not enforce the brain's 0.5-1% risk rule.
6. See the Experts/Journal tabs for HTTP response and order results. WebRequest
   runs on ticks and may block the EA while waiting. It does not work in the MT5
   Strategy Tester. No order occurs while the endpoint returns HOLD.
7. A future verified, authenticated signal service must provide flat JSON with
   action BUY or SELL, symbol (exact chart symbol), confidence (>70 and <=100),
   sl and tp (prices), signal_id (strictly increasing positive integer up to 2^53-1), and
   expires_at (UTC Unix seconds within the allowed lifetime). The EA rejects
   mismatched, stale, duplicate or malformed signals, high spreads and open
   positions on the symbol. It attaches SL/TP; it does not trail/manage exits.
8. Do not enable live trading without an independent security and broker review,
   a trusted authenticated signal service, risk sizing, and extensive testing.
   HTTPS alone does not authenticate a signal producer; this sample does not
   implement signal authentication and must be modified before any real feed. Chart AI confidence is
   uncalibrated and must never be treated as a trading guarantee.

The server has no authentication or real signal provider at this time. API_URL
is a public HOLD endpoint; nobody should rely on this example for live orders.
