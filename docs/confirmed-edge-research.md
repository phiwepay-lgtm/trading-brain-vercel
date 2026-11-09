# Confirmed-edge research indicator

`reference/legacy-ea/superseded-pro-v1/TradingBrain_Confirmed_Edge_Research.pine` (archived, no longer a public download) is a **visual-only, uncompiled TradingView research draft**, archived alongside the four older Pro V1 sources. It combines selectable BT and FTB modes and requires a 0.382 reaction for both. It does not submit orders or simulate trade results. The older Pro V1 files, browser chart, tester, and Dark Orders comparisons still use the former FTB bypass and do not represent this correction. Nothing here establishes journal fidelity, native platform compilation, profitable results, or a particular number of trades.

## User-confirmed rules

- M5 Heikin Ashi higher highs and higher lows are required for **both buy and sell** setups.
- BT and FTB are in one system with both or either mode selected. Mirrored fib: buy 0.382 below the swing high, sell 0.382 above the swing low.
- FTB needs an actual touch of the expected M5 HA level, not a 30-tick near miss. The user selected failed high: bullish HA closing below the high, after a bearish HA; trade direction sell. For failed low, the user described an expected bearish candle followed by a bullish candle; trade direction buy. Both conditions therefore use bearish-to-bullish HA colour shift; **do not silently substitute a bearish failure-high candle**.
- Both paths wait for a later standard M1 candle to touch the fib; then a standard M1 close crosses the latest confirmed swing high (buy) or low (sell), then a later full body engulf must exceed 1.2 times the previous body. The later entry does not require a separate 30-tick proximity to fib. No session or volume filter is added.

## Provisional mechanics and limitations

The script uses 2-left/2-right confirmed pivots, which are visible only after right-side confirmation; latest prior confirmed HA swing pair for FTB fib anchors; breakout candle HA extreme and prior opposite HA swing for BT anchors; 200 M5-bar pivot age; 10-tick stop buffer; and 2.5 R target by default. These are assumptions/settings, not confirmed journal parity. Levels are initialized from previously confirmed pivots, expire by pivot age and are invalidated on a successful HA close through the level. Fib levels are frozen for a setup. One pending setup can replace another; simultaneous incompatible events are suppressed. After a missing M1 interval, the pending setup and active levels are reset. Open-position or exit simulation is not included. Event counts include candidates with invalid anchors, not completed trades. The plot shows the last signal's stop/target, not a trade ledger.

The different phases are required on successive M1 bars because the intrabar order cannot be established from OHLC. Mode selection happens before setup state updates, so BT events do not consume FTB-only state, and vice versa. Signal and target marker values are research approximations and are not broker fills.

Use a standard **M1** chart, not an HA chart. The indicator computes completed M5 HA internally. Paste the entire `.pine` source into TradingView Pine Editor and compile. The source has not been compiled there; source-level tests are not a Pine compiler. Confirm exact pivot/fib anchors, event sequence, expected timestamps, gaps and real price feed with the user before translating to MT5 or the web tester. Do not claim the Nov 2–6 period yields 15 or more trades without the symbol, year, feed and historical validation.
