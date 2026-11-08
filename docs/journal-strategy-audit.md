# 40-record journal audit and v14 structural study

The user confirmed that the GitHub `gold-journal-recovery.json` is the intended journal. `/mnt/data` did not exist at audit time, nor was a screenshot ZIP available there. Record counts do not establish whether the export is complete relative to the broker account; its outcomes and P/L are not independently verified. This file contains no raw journal records, notes, screenshots or financial results.

| Source | Records / labels | Use and limits | Conflicts / image review |
|---|---|---|---|
| Recovery export | 40 records: 34 BT 0.382, 5 FTB 0.382, 1 scalp | Labels are descriptive, not verified trades or learned rules. | Rows 14, 15, 26 (one-based) say BUY and VLB. Sixteen records have no explicit `status`. |
| Embedded screenshots | 24 of 40 records | Two images reviewed, 22 not yet assessed. A full-sequence usable count is unknown, not zero. | Reviewed row 1 (SELL) and row 2 (BUY) show M5/M1 views, but neither clearly identifies the 0.382 anchors and entire break/pullback/engulf sequence. The chart is bounded by the screenshot; the relevant context may be outside the visible crop. |
| PR12 strategy | N/A | Generic M1 body-engulfing at preceding five-bar extreme, plus M5 range-level bias. It was not fitted to the journal. | No verified M5 BOS, 0.382 anchor, session order block, or M1 break-pullback-engulf sequence. |

No full rules were verified by the reviewed evidence. The user previously described VLB as sell and VHB as buy and now also mentions session order blocks, but the exact mapping, session, boundaries, pivots, 0.382 anchors, break, pullback, engulf and invalidation rules require confirmation. Conflicting labels must not be silently rewritten. All 40 examples remain pending review; `clear_examples` is empty because absence of a direction-label conflict alone does not establish that a setup is clear. The three conflicts are rows 14, 15 and 26, each BUY labeled VLB.

## Experimental v14 — not verified strategy logic

`public/ea/TradingBrain_M5_M1_v14.pine` is a separate, default-off structure study based on the user's Part 1 and Part 2 descriptions. It does not replace the legacy PR12 download. The separate prior five-bar-extreme v14 study was removed; PR12 remains a legacy proxy and was not fitted to the journal.

The v14 draft uses provisional M5/M1 confirmed pivots, an M5 breakout, a candidate 0.382 level and a sequential M1 CHoCH/engulfing simulation. Those algorithmic interpretations have not been verified against the journal screenshots. It is not proof of the user's visual setup or performance; the session times, pivot rules and bearish fib anchors remain to be confirmed. The bullish break is labeled VHB and bearish break VLB; the phrase “VLB anchor” in the bullish example remains ambiguous. Do not reinterpret the three conflicting journal records without confirmation.

The TradingView broker emulator is set to process at signal-bar close; actual live fills may differ. No MT5 bridge, live execution or alerts exist. The Pine has not been compiled or backtested in TradingView; reference/static tests do not execute Pine. See `docs/m5-m1-v14.md` for state transitions and assumptions.

Next: review all 24 images, and ask the user for one annotated VLB SELL and one annotated VHB BUY showing M5 break and fib anchors, M1 break/pullback/engulf, session order-block meaning, and intended stop. Confirm the three conflicting rows without changing them. Use chart history and out-of-sample/forward review before making any strategy claim.
