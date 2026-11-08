# Trading Brain v15 — BT and FTB source package

## Status and safety

This is an **experimental source package**, not a verified or profitable trading system. The supplied v15 Pine strategy is unchanged. Its chart structure, pivot selection, session settings and anchors are user-described approximations, not fitted to the 40-record journal. Neither the Pine scripts nor the MQL sources were compiled or tested in TradingView or MetaEditor here. The MQL ports are unverified drafts and **must not be considered equivalent to the Pine strategy** until compiled and compared bar by bar. No EX5 or MT5/website bridge is supplied.

The new EAs are off by default. They use `CTrade` only inside the MT5 Strategy Tester and only when `Enable_Simulation`, session/clock confirmations and `Enable_StrategyTester_Orders` are explicitly enabled. They cannot place live or demo account orders; the existing MT5 visual scanner is unchanged. MT5 Strategy Tester market orders are submitted on the first tick after the signal M1 bar closes, not guaranteed at signal close. Check broker volume, stop rules, spreads, gaps and fills. Tick size and contract/lot units may differ from TradingView.

## BT versus FTB

- **BT / Break Theory:** a completed M5 Heikin Ashi close breaks a confirmed swing. With valid leg anchors the draft waits for a 0.382 touch, M1 CHoCH and confirmation; its entry close must be within the configured 0.382 tolerance.
- **FTB / Failure to Break:** a completed M5 Heikin Ashi candle approaches a previously confirmed HH/LL, closes back on the failure side and shifts colour. The prior opposite colour is required by default. Failed high routes to bearish M1 CHoCH; failed low routes to bullish M1 CHoCH. FTB does **not** require the BT fib touch or entry-proximity filter.
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
