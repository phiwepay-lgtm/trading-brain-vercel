// Package contents are user-specified rules and claimed aggregate figures, never raw journal data.
export function packageFiles(ratio) {
  if (!Number.isFinite(ratio) || ratio < 2 || ratio > 7) throw new RangeError('R:R must be between 2 and 7');
  const system = {
    version: '1.0-user-rules-unverified',
    symbol: 'XAUUSD',
    timeframes: { confirm: 'M5', execution: 'M1' },
    setups: {
      'BT_0.382': { desc: 'Break Test: After BOS, pullback to 0.382 fib, VLB/VHB break + engulf continuation', type: 'continuation' },
      'FTB_0.382': { desc: 'After BOS + pullback to 0.382, price dips slightly below new structure as if breaking but fails, then VLB/VHB + engulf continuation', type: 'continuation-variant' }
    },
    exec: {
      VLB: { side: 'SELL', definition: 'M5 confirm, M1 BOS/CHoCH breaks LOW, small pullback, engulfing candle to new lower low - Entry on engulf close' },
      VHB: { side: 'BUY', definition: 'M5 confirm, M1 BOS/CHoCH breaks HIGH, pullback (sometimes none), engulfing to new higher high - Entry on engulf close' }
    },
    risk: {
      sl_mode: 'fixed_3_usd_or_ATR', tp_mode: '7R_default', selected_hypothetical_r: ratio,
      hypothetical_optimizer: '2.0 to 7.0 - slider recalculates IF same Full TP trades reached target, not proof',
      note: 'User-proposed alternatives, not tested or implemented; $3 is a price distance for XAUUSD. ATR period, multiplier and choice between alternatives are unspecified. The selected R is hypothetical.'
    },
    filters: { bias: 'continuation_preferred', session: 'NY 14-16h best per data', symbol: 'GOLD primary', note: 'User-provided claim and proposed New York local-time filter, not independently validated or inferred from journal timestamps.' },
    stats_source: {
      trades: 40, total_pnl: 303, winrate_full_tp: 27.5, avg_R: 1.8, profit_factor: 4.7,
      verified: false, note: 'User-provided claims, not recomputed from the uploaded journal or verified against a broker. Full TP rate as supplied; other denominators, rounding and P/L currency unverified.'
    },
    disclaimers: [
      'User-provided journal, not verified brokerage performance',
      'Demo/binance prices are not live market execution',
      'Hypothetical R:R results assume same trades reach target - not backtest proof',
      'The version name is user-provided; rules were not extracted from or validated against the encrypted learned-system file.',
      'The Pine script is a manual annotation skeleton. It does not detect setups, backtest results, place orders or connect to MT5.'
    ]
  };
  const pine = `//@version=5
indicator("BT_FTB_VLB_VHB_User_Rules_Manual_Study", overlay=true, max_labels_count=500)

// User-provided rules. This is a manual-annotation skeleton, NOT detection or an EA.
// Inputs are references only: no automatic session filter, fib calculation, risk/target or trades.
fibLevel = input.float(0.382, "Fib level (reference only)", step=0.001)
sessionFilter = input.session("1400-1600", "New York session (reference only)")
R = input.float(7.0, "R:R (reference only)", minval=2.0, maxval=7.0, step=0.1)

// TODO: Define and validate M5 confirmation and M1 BOS/CHoCH before marking BOS.
// TODO: Define swings, pullback and the precise 0.382 anchors; distinguish BT and FTB.
// TODO: VLB SELL: break low, small pullback, engulfing close to new lower low.
// TODO: VHB BUY: break high, optional pullback, engulfing close to new higher high.
// TODO: Define engulfing and confirm the sequence before marking an entry at its close.
// These TODOs intentionally produce no automatic signals. No orders are placed.

// Optional manual annotation: select the OPEN time of each M1 bar you inspected.
// Markers are user annotations, NOT detected confirmations or executable entries.
showManual = input.bool(false, "Show manual M1 annotations")
bosTime = input.time(timestamp("01 Jan 2024 00:00 +0000"), "Manual BOS bar open time")
vlbTime = input.time(timestamp("01 Jan 2024 00:00 +0000"), "Manual VLB sell bar open time")
vhbTime = input.time(timestamp("01 Jan 2024 00:00 +0000"), "Manual VHB buy bar open time")
entryTime = input.time(timestamp("01 Jan 2024 00:00 +0000"), "Manual engulf entry bar open time")
entrySide = input.string("SELL", "Manual entry side", options=["SELL", "BUY"])
m1 = timeframe.isminutes and timeframe.multiplier == 1
atBar(t) => time <= t and time_close > t
plotshape(showManual and m1 and atBar(bosTime), title="Manual BOS", text="BOS*", style=shape.circle, location=location.abovebar, color=color.yellow, textcolor=color.white, size=size.tiny)
plotshape(showManual and m1 and atBar(vlbTime), title="Manual VLB sell", text="VLB*", style=shape.triangledown, location=location.abovebar, color=color.red, textcolor=color.white, size=size.tiny)
plotshape(showManual and m1 and atBar(vhbTime), title="Manual VHB buy", text="VHB*", style=shape.triangleup, location=location.belowbar, color=color.green, textcolor=color.white, size=size.tiny)
plotshape(showManual and m1 and atBar(entryTime) and entrySide == "SELL", title="Manual sell entry", text="ENTRY*", style=shape.triangledown, location=location.abovebar, color=color.orange, textcolor=color.white, size=size.tiny)
plotshape(showManual and m1 and atBar(entryTime) and entrySide == "BUY", title="Manual buy entry", text="ENTRY*", style=shape.triangleup, location=location.belowbar, color=color.orange, textcolor=color.white, size=size.tiny)

var label studyWarning = na
if barstate.islast
    label.delete(studyWarning)
    studyWarning := label.new(bar_index, high, "Study only - manual markers from user rules, not financial advice, requires manual validation\\nMarkers are manual annotations; no pattern detection.", style=label.style_label_down, color=color.orange, textcolor=color.black)
`;
  const readme = `TRADING SYSTEM DEVELOPMENT PACKAGE — STUDY ONLY

This ZIP is not an MT5 EA or a working auto-trader. It contains a user-supplied specification and Pine v5 manual-annotation skeleton for development and review. No connection, broker data, journal records, orders, automatic signals or backtest engine are included. The encrypted learned-system file was not read or verified; these are user-supplied rules, not a fitted strategy.

SYSTEM
M5 structure confirmation, then M1 execution on the engulfing candle's close.
VLB (Visual Low Break) is for SELLS: M1 BOS/CHoCH breaks a low, a small pullback follows, then an engulfing candle continues to a new lower low.
VHB (Visual High Break) is for BUYS: M1 CHoCH breaks a high, pullback (sometimes none), then engulfing continues to a new higher high.
BT (Break Test) 0.382 is a continuation after BOS and a pullback to 0.382. FTB (Failure To Break) 0.382 is the user's continuation variant: after BOS and the pullback, price dips slightly below new structure as if breaking but fails, then VLB/VHB + engulf continuation. Exact pivots, swing, engulf and failure thresholds are not specified and require manual validation.

RISK AND SLIDER
User-proposed stop alternatives: XAUUSD $3 price distance or ATR. ATR period and multiplier, the choice between alternatives, position sizing, costs and execution rules are not specified or implemented. Direction and stop validity require independent review. Default target is 7R; the dashboard slider selected 1:${ratio.toFixed(1)} when this package was downloaded. In the dashboard, the 2.0–7.0 slider assumes each explicit Full TP would still reach the chosen target, each explicit SL is -1R and each BE is 0R. Unknown/generic outcomes and conflicting labels are excluded. It is a what-if, not target-by-target historical proof or a tested optimum. The Pine R input defaults to 7.0 and does not read the dashboard slider or apply a target.

TRADINGVIEW VISUAL STUDY
1. Open TradingView Pine Editor, paste strategy.pine, save and add it to an XAUUSD M1 chart. TradingView may use broker-specific GOLD symbols and prices.
2. The warning label is always shown. The script is a skeleton: fib, New York 14:00–16:00 session and R inputs are reference values only. It does not filter or detect BOS, VLB, VHB, engulfing, FTB or entries. It does not calculate results.
3. Review M5 structure and M1 candles manually using chart history or Bar Replay. Decide your own precise criteria first. Optionally enable manual M1 annotations and choose the OPEN time of the relevant BOS, VLB, VHB and engulf entry bars; the starred labels are manual only, not detected signals. All four markers have separate times and can be disabled together. Use the chart timezone and correct bar-open times when choosing inputs. Only one example per marker type can be shown at a time.
4. Manually record trades and evaluate target/stop outcomes, spread, fees, slippage, out-of-sample results and whether alternative targets were actually reached. Do not treat annotations as a backtest or financial advice. Pine and broker behavior have not been tested here; independently validate before use.

PROVENANCE
The figures in system.json (40 trades, 303 P/L, 27.5% explicit Full TP, 1.8 average R, 4.7 profit factor) and NY 14–16 as best are user-provided claims; they are not recalculated from the currently uploaded journal, broker-verified or a verified 33-trade summary. P/L units and other denominators are unverified. Demo and Binance proxy prices are not live market execution. No raw journal data is included.\n`;
  return { 'system.json': JSON.stringify(system,null,2)+'\n', 'strategy.pine': pine, 'README.txt': readme };
}
