TRADING BRAIN - v15.3 RESEARCH TOOLKIT

SAFETY AND STATUS
TESTED: automated synthetic strategy fixtures, source checks and website
workflows. These tests do not establish platform compilation, broker execution
or verified profitability.
All sources are uncompiled research drafts. No EX5, verified performance,
MT5 connection or live trading bridge is supplied. The website signal endpoint
remains HOLD. The MT5 tester EA cannot run on live or demo accounts; its two
order gates are false by default. The chart workspace is a separate research
replay, not an MT5 connection or broker fill emulator.

METATRADER 5 VISUAL TEMPLATE DRAFT
TradingBrain_Visual_Draft.tpl is a separate hand-authored M1 appearance draft.
It has not been generated or load-tested in MT5 and may not work. It has no EA,
custom indicators or trading permissions. If it loads, verify the chart and
save it again using MT5 to create a terminal-generated template. It does not
contain the strategy and is not included in the tester ZIP.

METATRADER 5 STRATEGY TESTER
1. Unzip TradingBrain-MT5-v153-Tester.zip. It contains the tester source, six
   .set input presets and a detailed guide in Docs. Alternatively download the
   standalone TradingBrain_Tester_v153.mq5 source.
2. In MT5, use File > Open Data Folder. Copy the source into MQL5/Experts and
   presets to a convenient location, such as MQL5/Presets. Open the source in
   MetaEditor and compile locally. Compilation has not been verified here.
3. Open Strategy Tester; choose the compiled EA, broker symbol, M1 timeframe,
   available dates and tick model. Load a preset and review all inputs. Each
   preset has Enable_Simulation=false and Enable_StrategyTester_Orders=false.
   Both must be enabled deliberately for simulated orders in Strategy Tester.
4. Bypass_Session=true by default. If disabling bypass, confirm the proposed
   session times and fixed broker UTC offset for the full history; broker DST
   can invalidate a fixed offset. Check the tester Journal for insufficient
   history, skipped events and rejected orders. Candidate counts are not fills.
5. The .set presets contain inputs, not chart templates. Broker coverage,
   spread, execution, lot rules and fills can change results. The RR presets
   select target settings and do not guarantee realized risk/reward or returns.

TRADINGVIEW
TradingBrain_M5_M1_v153_Mirrored.pine uses the selected mirrored bearish BT
rule in a separate source draft. It is uncompiled and still requires
bar-by-bar validation; shared rules do not guarantee platform parity.
Simulation remains off by default.
TradingBrain_Indicator_v153_Mirrored.pine is a separate indicator using
the mirrored draft, visual markers, virtual positions and optional alerts.
It is uncompiled; its virtual exits are not guaranteed to match the strategy
emulator and alerts are not broker orders.

TradingBrain_M5_M1_v15.pine is the separate v15.3 strategy draft. Paste it
into TradingView's Pine Editor and compile it there on a standard M1 chart.
Simulation defaults off. It has not been compiled or backtested here, and it
is not an MT5 bridge. Its bearish BT structure and fib anchor differ from the
mirrored MT5 tester draft; their results are not interchangeable. Session
settings and mechanical swing choices remain provisional.

CHART WORKSPACE
/chart provides M1/M5 candles, research overlays, a candidate timeline and
an optional OHLC simulation. The selected tick size is an assumption; the
provider may supply less history or use demo or proxy prices. Simulation uses
signal-close entries, stop-first ambiguous bars, no costs, and censors positions
when M1 intervals are missing. It is not a broker or TradingView backtest.

PRIVACY AND LIMITATIONS
No raw journal, account credentials or private reports are included in these
source downloads. Journal uploads, if chosen elsewhere in the app, are sent
for transient validation and stored in the browser; do not use a shared device.
Do not add private data to this repository. None of the research outputs is
financial advice or proof of real-world performance.
