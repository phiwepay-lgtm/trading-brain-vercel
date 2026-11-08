# Trading Brain v15.3 — MT5 Strategy Tester setup

## What this is

`TradingBrain_Tester_v153.mq5` is a **new, uncompiled research draft**, not a validated translation or trading recommendation. It is separate from the existing MT5 visual scanner, which remains DISABLED/HOLD. It is hard-restricted to the MT5 Strategy Tester: initialization fails outside the tester and its order function checks the tester flag and two separate opt-ins. No live or demo-account orders, EA bridge, EX5, broker history or raw journal are supplied.

The package includes six **input presets**, not chart templates:

| File | Entry mode |
| --- | --- |
| `TradingBrain_v153_Both.set` | Both BT and FTB |
| `TradingBrain_v153_FTB_Only.set` | FTB entries only |
| `TradingBrain_v153_BT_Only.set` | BT only, 1:2.5 (default RR) |
| `TradingBrain_v153_BT_RR2.set` | BT only, 1:2 target |
| `TradingBrain_v153_BT_RR5.set` | BT only, 1:5 target |
| `TradingBrain_v153_BT_RR7.set` | BT only, 1:7 target |

All six presets leave `Enable_Simulation=false` and `Enable_StrategyTester_Orders=false`. The `.set` format and loading have not been verified in a running MT5 terminal; after loading, inspect every input and re-save it from MT5 if necessary. The preset does not carry the tester symbol, dates, tick model, costs, account size or execution settings.

## Install and compile

1. On a desktop MT5 installation, select **File → Open Data Folder**. Copy `TradingBrain_Tester_v153.mq5` into `MQL5/Experts/` and the `.set` files to a convenient location (for example `MQL5/Presets/`).
2. Open the source in MetaEditor and press **F7 / Compile**. Resolve any errors before continuing. We could not run MetaEditor here and do not claim it compiles. Refresh the Experts list or restart MT5 if needed. The compiled EX5 is created on your computer, not supplied by this project.
3. This EA is intentionally tester-only. Do not attach it to a live or demo chart expecting signals or orders. The original visual scanner and website status remain disconnected/HOLD.

## Run one controlled test

1. Open **View → Strategy Tester** (Ctrl+R). Choose the compiled `TradingBrain_Tester_v153`, the broker's actual gold symbol (for example `XAUUSD`, `XAUUSD.a` or another broker suffix), and **M1**. Symbol availability and naming vary by broker.
2. Choose **Every tick based on real ticks**, a date range your broker actually supplies, and the intended tester deposit, account currency, leverage, execution mode and costs. Real-tick testing can take considerable time and disk space. In MT5, missing or inconsistent tick history can result in generated ticks; inspect the tester Journal and the available data rather than assuming every tick is real. See [MetaTrader Strategy Testing](https://www.metatrader5.com/en/terminal/help/algotrading/testing) and [how the tester downloads data](https://www.metatrader5.com/en/terminal/help/algotrading/test_preparation).
3. In **Inputs → Load**, choose one of the matching v15.3 `.set` files and verify the `Test_Mode` value (0 = Both, 1 = FTB only, 2 = BT only). The presets are intentionally inert: for simulated Strategy Tester trades, explicitly set **both** `Enable_Simulation=true` and `Enable_StrategyTester_Orders=true` inside the tester. Orders are still blocked outside the tester. Review the broker's minimum lot, volume step, stops and `Order_Quantity` (MT5 lots, not Pine quantity units). No particular lot size is recommended.
4. `Bypass_Session=true` tests all available hours and does not require clock confirmation. For session-restricted tests set it false and explicitly confirm **both** the proposed sessions and `Broker_UTC_Offset_Minutes` for the entire historical period. The offset is fixed; broker DST or historical changes can make a long run invalid. The proposed windows are NY 09:30–16:00 and UTC 01:00–06:00, not verified trading rules.
5. Run a **short visual test first**. FTB levels are magenta, BT fib orange, and M1 CHoCH aqua. Markers are candidates or accepted tester orders, not verified fills. Inspect the Strategy Tester Journal for errors, insufficient-history counts, rejected-order retcodes and the final `TB v15.3 diagnostics` line. Its BT/FTB/CHoCH/entry counts are diagnostic events, not closed-trade totals or performance.
6. After the short run works, extend the requested dates in stages to the **oldest broker history available**, checking actual first/last processed times and gaps. Data coverage is broker- and symbol-dependent; this package cannot download or guarantee history on your behalf. The EA requests up to `HA_History_Bars=5000` prior M5 bars per M5 update for HA initialization; this is a rolling seed window, **not a cap on the tester date range**. Longer windows and real ticks can be slow. MT5 may adjust the usable test start to load warm-up data; check the report and Journal.
7. Save the tester's **Results / Report** and relevant Journal output locally. Record broker/server, exact symbol, date range, M1, test mode, tick model and coverage, deposit/currency/leverage, commission/spread/swap, execution settings, all EA inputs, and the terminal build. Before sharing, remove account numbers and other personal details. Results remain simulated and do not prove profitability.

## Comparing BT with FTB

Run Both, FTB Only and BT Only separately with the **same broker data, period and tester settings**. Keep `Use_FTB=true` for FTB tests. All BT-only presets set `Use_FTB=false`, preventing FTB candidates from replacing BT setups. In FTB Only mode, BT detection still affects shared setup state because mode selection filters entries rather than detection; the FTB run is **not completely isolated**. Use a later untouched period for out-of-sample checking; do not tune parameters to produce a required trade count. The exact number of setups, fills, win rate and profit factor are unknown until independently tested.

## BT setup and the RR presets

The draft implements a provisional mirrored BT sequence:

1. A **completed M5 Heikin Ashi close** breaks a confirmed swing high (buy) or low (sell).
2. It draws a 0.382 retracement from the broken-leg extremes: for a buy, the latest confirmed HA low to the BOS candle HA high; for a sell, the BOS candle HA low to the latest confirmed HA high. These pivot/anchor choices are a mechanical approximation and need chart validation.
3. A standard M1 candle touches the fib level. A later standard M1 close breaks the confirmed visual high (VHB) for a buy or visual low (VLB) for a sell, subject to the existing M1 swing-shape rules.
4. After CHoCH, a consecutive opposing M1 candle and a larger engulfing M1 candle are required; the engulfing body must be **strictly greater** than 1.2 times the previous body by default. BT additionally requires the engulfing close to be within `Fib_Tolerance_Ticks=30` broker trade ticks of the fib level. If the user wants a pullback to a particular price level, that specific level is not separately checked by this draft.
5. With all tester gates enabled, the EA requests a simulated entry on the first available tick after confirmation. Stops are beyond the engulf candle with a 10-tick default buffer. The target is `RR_Ratio` times the signal-close-to-stop distance.

Load `BT_RR2`, `BT_RR5`, or `BT_RR7` to select a **target setting**, not a promised outcome. You can also edit `RR_Ratio` directly. The calculated bracket uses the signal close, not the eventual fill; spread, slippage and broker rules mean the actual fill-to-stop/target ratio may differ.

## Create your MT5 chart template

The supplied `.set` files contain inputs only; they are not `.tpl` charts. On your own terminal, arrange an XAUUSD M1 chart (candlesticks, colours and any indicators you want), right-click the chart and select **Templates → Save Template**. Save it as `TradingBrain_Visual.tpl`; MT5 stores templates under `MQL5/Profiles/Templates/`. Leave any live-trading EAs off the chart when saving: chart templates may store attached EAs and their inputs. MT5 also recognises `tester.tpl` for tester result charts; consult [MetaTrader Templates and Profiles](https://www.metatrader5.com/en/terminal/help/charts_advanced/templates_profiles). We cannot generate or verify a native MT5 chart template without your terminal.

## Important differences and limits

- This port is a draft. Its HA seed window, M5/M1 pivot tie handling, data gaps, startup/restart state, symbol specifications and fixed broker-offset implementation can diverge from Pine. Its bearish BT path now mirrors the bullish path; the current Pine v15.3 retains an additional bearish structure filter and different fib anchor, so their bearish BT signals are **not equivalent**. The port does not reconstruct every setup before the test starts. Compare bar-by-bar events before interpreting the results as equivalent.
- MT5 orders are submitted on the first available tick after the signal M1 bar closes. TradingView's `process_orders_on_close` is a different broker-emulator setting; spread, tick size, lot units, commissions, rejected orders and fills can differ. The RR target uses the signal close to stop distance rather than actual fill-to-stop distance, so slippage and spread can change the realised risk/reward. Tester report history is not verified journal performance.
- FTB requires a synthetic HA wick to touch and penetrate no more than 30 broker trade ticks by default; a near miss is rejected. HA prices are synthetic, so this does not prove the executable market touched the level. FTB bypasses BT's 0.382 filter. Standard M1 OHLC is used for CHoCH and engulfing.
- The EA needs at least `M5_Lookback + M5_Left + M5_Right + 4` loaded closed M5 bars before processing M5 signals. It fetches up to 2,000 closed M1 bars per processed bar for M1 pivots. Insufficient-history counters count failed processing **attempts**, not the number of missing bars. Reported M5 copy-window min/max are fetched bar counts, not a data-quality score. If completed M5 bars are skipped, a diagnostic gap event is counted and existing expectations are cleared rather than guessing what happened in the missing interval; those events are not replayed.
- Outputs and data stay in your MT5 environment; there is no upload to this website. Do not put raw journal records, account credentials, or private broker reports into the repository.
