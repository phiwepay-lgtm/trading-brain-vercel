# Trading Brain v15 — BT and FTB source package

## Status and safety

This is an **experimental source package**, not a verified or profitable trading system. The v15 Pine strategy has experimental sensitivity and pivot-expectation changes described below. Its chart structure, pivot selection, session settings and anchors are user-described approximations, not fitted to the 40-record journal. Neither the Pine scripts nor the MQL sources were compiled or tested in TradingView or MetaEditor here. The MQL ports are unverified drafts and **must not be considered equivalent to the Pine strategy** until compiled and compared bar by bar. No EX5 or MT5/website bridge is supplied.

The new EAs are off by default. They use `CTrade` only inside the MT5 Strategy Tester and only when `Enable_Simulation`, session/clock confirmations and `Enable_StrategyTester_Orders` are explicitly enabled. They cannot place live or demo account orders; the existing MT5 visual scanner is unchanged. MT5 Strategy Tester market orders are submitted on the first tick after the signal M1 bar closes, not guaranteed at signal close. Check broker volume, stop rules, spreads, gaps and fills. Tick size and contract/lot units may differ from TradingView.

## BT versus FTB

- **BT / Break Theory:** a completed M5 Heikin Ashi close breaks a confirmed swing. With valid leg anchors the draft waits for a 0.382 touch, M1 CHoCH and confirmation; its entry close must be within the configured 0.382 tolerance.
- **FTB / Failure to Break:** a completed M5 Heikin Ashi candle touches or crosses a previously confirmed pivot high/low, closes back on the failure side and shifts colour. The prior opposite colour is required by default. Failed high routes to bearish M1 CHoCH; failed low routes to bullish M1 CHoCH. FTB does **not** require the BT fib touch or entry-proximity filter.
- The v15 strategy's completed M5 HA data is synthetic. Its M1 chart must use standard candles. Signals are only candidates; exact visual pivots, fib anchor identification, failure and session criteria require manual validation.

## State machine

```text
NO_SESSION -> EXPECTING_BOS
                  |-- BT_FOUND -> WAITING_0382 -> WAITING_CHOCH --|
                  |-- FTB_FOUND ----------------> WAITING_CHOCH --|--> CHOCH_FOUND
                                                               -> pullback/engulf -> ENTRY_SIGNAL
```

Ambiguous simultaneous M5 events hold; invalid BT anchors lead to WAITING_ANCHORS. Setups reset outside the golden sessions. Open tester positions keep their submitted brackets. The Pine indicator uses a simplified virtual position for repeat-entry suppression; when both stop and target occur within a bar, it assumes a stop-first virtual exit. Its signals can therefore differ from the TradingView Strategy Tester. Alerts are optional indicator candidate notifications, not broker fills or orders.

## MT5 translation caveats

`TradingBrain_v15.mq5` and `TradingBrain_Tester_v15.mq5` share the same draft engine; the latter adds visual annotations **only in visual Strategy Tester mode**. They compute HA internally from available history. HA initialization, pivot tie handling, missing bars, historical broker timezone/DST, price feed, fills, sessions, and startup state can differ from Pine. `Broker_UTC_Offset_Minutes` is a fixed broker-bar-time offset and must be independently confirmed for the **entire tested history**; broker DST changes may invalidate a run. Session defaults are NY 09:30–16:00 America/New_York and Asian 01:00–06:00 UTC, all days; user confirmation is still required. MQL `Order_Quantity` is lots, not Pine units. MT5 tester-only CTrade orders are not a live bridge.

Compile each `.pine` in TradingView and each `.mq5` in MetaEditor, inspect errors and warnings, and compare both M5 and M1 event sequences using annotated bars before relying on any outputs. No 0-error compilation or backtest has been verified. The MQL drafts do not reconstruct setups from before attachment; indicator virtual fills are not broker-emulator parity.

## Journal audit

The confirmed recovery export has 40 records. Rows 14, 15 and 26 (one-based) are BUY records labeled VLB; they remain unresolved and unchanged. See `AUDIT-40records.txt` for counts and review limits. No raw trades, notes or screenshots are packaged. No performance claim is inferred from this journal.

## Strategy sensitivity and debug settings

The standalone v15 strategy now defaults to M5_Lookback 200, with the latest high/low allowed up to twice that age (400 M5 bars by default). Previous-pivot and FTB-expectation age checks still use M5_Lookback itself. FTB now requires an exact touch or wick through the pivot (the former 50-tick approach setting was removed), and BT entry-close proximity to 0.382 defaults to 30 ticks; the BT fib-touch and FTB fib-bypass rules are unchanged. Tick size depends on the symbol.

`Debug_M5` defaults on and shows the last available HA pivot high/low outside golden sessions; a plotted pivot is not necessarily an active HH/LL expectation. The Data Window's "count" plots are per-bar 1/NA flags, not cumulative counts. The panel shows the requested current-bar pivot boolean, not a daily pivot count. Debug output does not enable the simulation or alter its session guards. These are sensitivity settings for investigation, not evidence of more correct setups or profitability.

Only `TradingBrain_M5_M1_v15.pine` has these new defaults. The separately supplied indicator and both MQL drafts retain their earlier settings and can produce different candidates; they have not been updated for parity. Pine compilation remains unverified.

## New-pivot expectation experiment

The strategy now accepts any new confirmed high or low pivot without comparing it to the previous high or low. The requested `expectedHighIndex[1]` / `expectedLowIndex[1]` comparisons are evaluated on the M1 chart: they create a one-M1-bar pulse when the previously confirmed M5 pivot first appears. As a result, FTB is only eligible on that first observation bar, not later attempts against an unchanged pivot; a pivot that first appears outside an enabled session is not carried into the session by this condition. The first available pivot may also be flagged when there is no previous index. This may reduce rather than increase signals. FTB now requires an actual touch or wick through the level, rather than a near miss; all existing colour, session and used-pivot guards remain. The bearish BT structural filter is unchanged.

The `M5 Pivots Today` table value is exactly the requested `isNewHighPivot or isNewLowPivot` boolean on the current chart bar. It is **not a counter**, is not reset daily, and is not a setup or trade count. The data-window expectation flags are likewise 1/NA pulses rather than counts. Nothing guarantees 10–20 setups per day; the change has not been compiled or backtested in TradingView. The indicator and MQL drafts do not contain this pivot-expectation experiment.

## Test Edge Mode (strategy only)

`Test_Mode` defaults to **Both** and also offers **FTB Only (my edge)** and **BT Only (common)**. It gates simulated entry confirmation, markers and order submission for both directions, before any entry state changes. The mode does not enable simulation or confirm sessions. `Use_FTB` remains an additional FTB detection switch; turning it off means FTB-only mode cannot produce FTB entries. BT still requires the 0.382 touch and entry proximity; FTB still bypasses those BT filters.

This is an **entry-only filter**, not an independent isolated replay: both types of setup continue to be detected, can become ambiguous or replace pending setups, and share pivot-use and position state. Consequently, changing the mode can affect which setups progress and results cannot be attributed solely to one edge. Compare identical symbols, data, sessions and settings, but do not treat the toggle alone as proof of an edge. The indicator and MQL drafts do not include this mode. TradingView compilation and backtesting remain unverified.

## Locked M1 Visual Break specification

Per the user's confirmation, VHB means **Visual High Break** and VLB means **Visual Low Break**, not virtual. M5 BOS and FTB continue to use completed Heikin Ashi candles. M1 pivot identification, VHB/VLB close confirmation, and engulfing use standard M1 chart candles; the VHB/VLB break must not be switched to an M1 HA close. The existing M1 pivot conditions are a provisional mechanical approximation of the visual levels, not independently validated equivalence.

The engulfing body must be **strictly greater than** the default 1.2 times the preceding body and satisfy the existing body-engulf and sequencing rules. This confirmation changes no Pine strategy logic. The separate persistent-FTB and tolerance question is not resolved by this decision; the current one-bar FTB expectation and exact-touch rule remain unchanged. The user's report of prior backtesting is not independently verified here; these source checks do not compile or execute Pine.
