# TradingBrain Pro V1 research drafts

> Superseded rule: the user subsequently clarified that FTB, like BT, requires a 0.382 touch. The four Pro V1 files and browser tester below have not been updated and must not be presented as the corrected edge. The separate `TradingBrain_Confirmed_Edge_Research.pine` is an uncompiled visual research draft of the newer interpretation; its assumptions and limits are documented in `confirmed-edge-research.md`.

Pro V1 consists of four separately downloadable source drafts: TradingView indicator and strategy, and MT5 indicator and tester-only EA. They have **not** been compiled or run on their target platforms. Their detection is still a mechanical interpretation, not a verified implementation of the user's discretionary edge. No real-history backtest, platform parity, fill quality or profitability is established. No live or demo-account order execution is authorized.

## Inputs used and user decisions

The existing mirrored drafts, browser research engine, written strategy notes and recovered journal were reviewed. Four further journal chart images were reviewed in addition to the two previously examined; the user also supplied a BT sell example and an FTB buy example in November 2026. These images give useful context but do not alone define every pivot, setup invalidation or risk-management rule. The private journal, chart images, identifiers and raw records are not included in these downloads.

The user confirmed:

- The selected BT interpretation is mirrored for buy and sell. BT requires a prior 0.382 reaction, but an entry after VHB/VLB and engulf can be farther away; **no separate 30-tick entry-close proximity gate** should be imposed.
- FTB bypasses the BT 0.382 filter.
- A new valid signal can create its own simulated position even if another trade is open. In particular, one open position must not suppress detection of later entries.

The drafts retain existing provisional pivot definitions, FTB touch bound and colour condition, timing, sessions, stops, reward/risk and single pending setup state. A newer M5 event can still replace a pending setup. These choices are not proof of the user's visual rules and can still omit expected signals; multiple *pending setups* are not tracked in parallel. Some journal records mention break-even or partial management, but the exact rules and inconsistent outcomes are unresolved, so the drafts do not claim to reproduce those behaviors. Session bypass is an all-hours research setting, not a confirmed edge rule.

## How each file behaves

- **TradingView indicator**: visual-only; enabled by default. Records independent virtual brackets and displays entry, virtual stop/target, ambiguous or missing-data markers and counters. A marker refers to a bar, not necessarily the exact fill price. Multiple exits on a bar may share a marker. It has no order API.
- **TradingView strategy**: simulation defaults off. It counts virtual independent positions separately from native Strategy Tester orders. Native TradingView strategies use a net position: opposing signals can reverse/net positions, and the configured native pyramiding limit and platform limits apply. The native report cannot represent independent simultaneously hedged long/short positions. Virtual totals are not the native trade report. Commission and platform fill assumptions differ from the no-cost virtual model.
- **MT5 indicator**: visual-only; enabled by default and replays loaded M1 history using earlier completed M5 bars. Its virtual position counts are not native deals. MT5 M1/M5 history, warm-up, chart limits and synchronization can restrict results. Full historical recalculation may be very slow, and its loading, markers and accounting have not been tested in a terminal. Use one instance per chart because it uses a shared chart-object prefix and comment panel.
- **MT5 EA**: hard-restricted to Strategy Tester, two order gates default off, and hedging account mode is required so opposing simulated positions are not silently netted. The native tester's orders, fills, costs, gaps and account settings differ from virtual OHLC brackets. Tester-run signal counts are diagnostic; reconcile deal/position counts with the native report. This draft does not reconstruct pre-run setups or journal positions.

The virtual models censor positions across missing minutes and when both stop and target are touched within a bar without knowing which came first. They are based on M1 OHLC, use simplified opening-gap handling, assume signal-close entry and omit costs; they are not tick-level broker backtests. Platform behavior and gap handling may differ. Signals, open, closed and censored positions are different categories; do not treat an unknown exit as a win or loss.

## Local checks and validation still required

The independent-position JavaScript research ledger has synthetic fixture tests for overlapping long/short positions, gaps, ambiguous bars and incremental replay; source-level checks cover the four drafts and safety gates. These tests do not execute MQL and do not establish TradingView or MT5 behavior. PineTS was used for a limited synthetic execution probe, not TradingView compilation, a real-data backtest or parity validation. The 2026 HTML report reviewed earlier used synthetic prices and zero costs; it is not evidence of a market edge.

Before relying on Pro V1, compile both Pine sources in TradingView and both MQL5 sources in MetaEditor, then compare every setup transition on actual M1 data with the supplied BT/FTB examples. Record symbol/feed, timestamp and timezone, data coverage and all settings. Inspect rejected tester orders and any missing warm-up, identify why expected signals did not appear, and resolve disputed pivots, session definitions, setup replacement and risk management with the user. Do not tune rules merely to manufacture a desired trade count.

Older downloadable sources are retained under `reference/legacy-ea` for audit and are not in the public download directory. The v14 Pine content is unchanged. The browser chart/tester remains a separate research implementation; it is not automatically replaced by Pro V1.
