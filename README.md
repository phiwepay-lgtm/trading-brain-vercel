# Dark Orders — Pure Price + History

This project contains the standalone price-only Dark Orders TradingView overlay and the separate Trend Predictor study. It is for journaling and context, not an automated trading system. The indicator is not verified in TradingView and does not identify institutional or dark-pool orders.

## Run locally

```sh
npm ci
npm run dev
```

Open `/` or `/ea` to download or copy the Pine source. In TradingView's Pine Editor, **replace all existing code** with the script before saving and adding it to a chart. The source is `public/ea/Dark_Orders_Pure_Price.pine` and has been retained unchanged.

Check changes with `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Browser tests use `npm run test:e2e` after installing Playwright Chromium and running a production build.

## Trend Predictor

The separate `/trend-predictor` page offers `public/ea/Trend_Predictor.pine`, an anchor-only adaptation of the supplied Rolling Candle Profile with Buy/Sell Signals by Zeiierman under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Attribution and license are retained. Its default is an equal blend of chart VWAP and the volume-weighted 21 EMA, computed as EMA(close × volume) / EMA(volume). The EMA length is adjustable; the blend is hidden if the current bar has no usable volume or either component is unavailable. EMA, SMA, VWMA, VWAP, and Donchian Mid are also available. Volume may be tick volume depending on the feed. Standalone VWMA and VWAP fall back to EMA when unavailable, and Donchian Mid uses the preceding window. The anchor and optional glow appear only after candle close; there are no signals or alerts. Data revisions, chart and settings changes, or different loaded history can still change values. TradingView compilation and real-time/reload behavior are unverified.

## Dark Orders + Trend Predictor, two in one

The `/two-in-one` page offers a combined TradingView Pine source and a **draft** Indie v5 source. The two components calculate independently: the anchor is not a filter for Dark Orders. The Pine version preserves the Dark Orders recap and alerts and processes all loaded bars, unlike the standalone anchor's 2500-bar calculation limit; initialization and values may differ. The Indie draft reconstructs Heikin Ashi from standard chart OHLC and does not yet include the recap table or alert conditions. It has not been compiled or tested in the user's editor. Session definitions, feed volume, loaded data, Heikin Ashi initialization and standard deviation implementations can differ across platforms. Anchor plots only confirmed chart candles; Dark Orders' current-bar color and labels can change before close. Data revisions can still alter past results. Neither platform is verified here. Original anchor attribution and noncommercial share-alike license apply to the combined work.

## My Session Range

The separate `/session-range` page offers a Pine v6 adaptation and an Indie v5 draft of the supplied Blackwatch Advisory - My Session Range (itself a modification of RobMinty's FXN - Asian Session Range). Both drafts display developing high/low steps and optional shading for each observed session in loaded history. Defaults are 03:00–07:00 fixed EST (UTC−5), with an explicit timezone replacing the supplied script's hard-coded broker offset. Choose America/New_York for Eastern time with daylight saving; Indie uses IANA `Etc/GMT+5` for fixed EST. The developing range changes while forming and uses bars whose open falls within the session. Missing data or bars crossing session boundaries affect the range. If no outside bars separate consecutive sessions, both drafts hide the first point to break the plot; that bar still contributes to the extrema. The Pine draft is limited to intraday charts up to one hour; both plots stop at observed session bars. On a TradingView Heikin Ashi chart Pine uses synthetic candle highs and lows, not executable prices. The user reports their Indie editor rejects the native Heikin Ashi chart type; use normal candles. The Indie draft uses the chart high and low, not synthetic Heikin Ashi prices. Neither version is compiled in its target environment; step/fill compatibility remains unverified.

## Supertrend Heikin Ashi MT5 tester draft

`/supertrend-tester` offers a source-only MT5 research ZIP built from `mt5/Supertrend`. It is tester-only, opt-in for orders, M1-only and an incomplete translation of the supplied MPL-2.0 Pine script. The EA creates a basic chart dashboard and synthetic HA study levels; it uses actual bid/ask for tester orders, with a full TP1 exit only. The package includes a script to save an MT5 template after the user configures the chart; it does not include a verified prebuilt template. MetaEditor compilation, Pine parity, execution, backtests and profitability are unverified. See `mt5/Supertrend/README.txt` for gaps and setup. Rebuild with `python3 scripts/package-supertrend.py`.

## NQ developing volume profile drafts

`/nq-volume-profile` provides a Pine v6 overlay and an Indie v5 draft for a latest-only developing window from 16:00 to 16:00 America/New_York, two hours before the assumed 18:00 CME futures open. It is a calendar reset, not an exchange calendar, and uses the chart feed and available bars. Volume is uniformly allocated over each candle range; the approximation is not SVP HD, lower-timeframe volume-at-price or true buy/sell volume. Standard aligned 1m–1h candles recommended, with up to 1,500 bars scanned by default; gaps, incomplete history, feed volume semantics and scan limits affect results. It displays POC, VAH and VAL but does not auto-adjust detail on zoom or extend previous levels. Indie’s drawing/scheduling APIs, including `Chart.clean`, need editor support. Neither script has been compiled or tested in its target platform.

## All in one (Basic plan)

`/all-in-one` provides `public/ea/All_In_One.pine`, a single TradingView Pine v6 indicator that combines Dark Orders, the Trend Predictor anchor, My Session Range, a daily-reset VVWAP, the NQ developing volume profile (16:00 New York, kept as a separate study) and a fixed-range Volume Profile for a dedicated UTC+2 window (default 11:00–19:00, like TradingView's Fix Range VP). Each study keeps its own input group and can be switched off; the NQ and fixed-range profiles are the heaviest and only draw on the last bar, so turn them off if a Basic-plan chart hits the 20-second calculation limit. The combined NQ status table is bottom-right and the Session VP table is bottom-left to avoid overlapping the Dark Orders recap. The Session VP is a fixed-range profile anchored to the session window (default 15:00–19:00 UTC+2). The script has not been compiled or verified in TradingView; PineTS executed its plots without error, which is not the TradingView compiler.

### Fixed-range VP presets

In All In One → **Session VP**, choose Custom, 11:00–19:00, 15:00–19:00,
or 09:00–17:00, interpreted in the profile timezone (default UTC+2). Custom
start/stop times support overnight windows. These inputs are independent of My
Session Range and NQ. The latest window develops on every incoming candle/tick,
excludes bars opening at the stop time, and remains frozen until the next window.
Align boundaries to standard 1m–1h candles; straddling candles cannot be split.

Colours: Original blue/orange, Teal/red, or four custom volume colours. POC colour,
width, label and right extension are configurable. Rows default to 24, value area
to 70%, width to one third of the observed window. Body/wick allocation is adapted
from LonesomeTheBlue’s *Volume Profile / Fixed Range* under MPL 2.0
(https://mozilla.org/MPL/2.0/). Wicks split equally between up/down; body follows
candle direction. Value area expands from POC until it reaches or exceeds target.
This is an estimate, not actual bid/ask volume. Missing history or the shared
maximum scan limit can make it incomplete. TradingView compilation remains unverified.

### Previous-session recap

Session VP now displays up to five recent sessions (default three, including the
latest). Each profile stays anchored to its own candles; only the latest POC may
extend right. No new profile is created before an actual candle opens inside the
configured window. Previous completed profiles remain visible before today's start.
Set **History bars to scan** (maximum 1800) independently of NQ. This is about 30
hours on 1m or 150 hours on 5m; only loaded, scanned sessions can appear. Increase
the chart timeframe for multi-day recap. Requested rows are capped to floor(150 /
sessions requested), reserving 200 boxes for NQ within TradingView's 500-box limit.
The latest session status reports incomplete history; older profiles can also be
partial at the scan boundary. Pine compiler/runtime verification remains pending.

### Current Session VP defaults (supersedes earlier row/style defaults)

The separate 16:00 New York NQ profile is now OFF by default (23:00 UTC+2
in New York winter, 22:00 in summer). Existing saved chart inputs may retain ON;
turn off **NQ Volume Profile → Show NQ profile** or reset the indicator settings.

Session VP: Number of Rows, 200 rows, Up/Down, 40% value area, 30% width,
left placement. Custom colours default to opaque #eaaf92 for up and value-area
up, #3f5a3f for down and value-area down, and #DBDBDB for POC. Identical inside/
outside colours mean value area is not colour-distinguished; VAH/VAL lines remain.
The selected session time and timezone behaviour is unchanged.

Rows now take priority over recap count. With NQ off, 500 boxes allow one
200-row up/down profile (up to 400 boxes). Reduce rows to 83 or fewer for three
profiles. With NQ enabled, 200 boxes are reserved for it and Session VP rows
are capped at 150. The status reports actual rows/sessions and DRAWING LIMIT.
This conservative budget prevents automatic deletion of older drawings. Width
is measured over the observed session bar span, not a native TradingView drawing.
TradingView compilation/runtime verification is still required.

## Trade webhook: TradingView alerts → risk-based plan

`POST /api/trade` turns a chart alert into a concrete trade plan — entry, stop
and a lot size derived from account risk settings, computed by `lib/trade.ts`
(`computeTradePlan`). The plan comes back as JSON.

Alert fields (all required):

- `symbol` — e.g. `EURUSD`
- `direction` — `long` or `short`
- `entry` — the alert entry price
- `stop` — stop price; below the entry for long, above it for short
- `balance` — account balance in the account currency
- `riskPercent` — fraction risked per trade (1 means 1%)
- `pipValuePerLot` — dollar value of one pip of one standard lot

Optional: `digits` (default 5, e.g. 3 for USDJPY), `pipSize` (overrides
`digits`), `minLot`, `maxLot`, `lotStep` (e.g. `0.01`).

Example request:

```sh
curl -s -X POST https://your-site.app/api/trade \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"EURUSD","direction":"long","entry":1.09456,"stop":1.09356,"balance":50000,"riskPercent":1,"pipValuePerLot":10}'
```

Example response:

```json
{"status":"ok","symbol":"EURUSD","direction":"long","entry":1.09456,"stop":1.09356,"lot":5.000000000000551,"pipsAtRisk":9.999999999998899,"riskUSD":500}
```

(`lot` ≈ 5 and `pipsAtRisk` ≈ 10 — the tiny decimal noise is normal.)

This endpoint computes the plan; it does not open orders or talk to an MT5
terminal itself. Use `scripts/mt5_sender.py` (below) to execute the plan on the
terminal. Set the optional shared secret `TRADE_WEBHOOK_SECRET` in the
environment and send it as the `x-trade-secret` header to require
authentication.

Tests: `npm test` includes the trade-sizing tests for `calculateLotSize`,
`stopPipsFor`, `pipSizeForDigits` and `computeTradePlan`.

## Local MT5 sender bridge: `scripts/mt5_sender.py`

`scripts/mt5_sender.py` is the sender that executes plans on the terminal:
entry, stop and the computed lot go out with `mt5.order_send`. Set
`MT5_BRIDGE_URL` on the route (e.g. `http://127.0.0.1:8123`) and every plan is
forwarded there; the route returns the bridge's response in the `mt5` field.

Setup:

1. Install the terminal-side package on the machine running the bridge:
   `pip install MetaTrader5`.
2. Terminal login: set `MT5_LOGIN`, `MT5_PASSWORD`, `MT5_SERVER` so
   `mt5.initialize()` can connect, or leave them unset to use the terminal's
   last login.
3. Start the bridge where the terminal is reachable:
   `python3 scripts/mt5_sender.py --host 0.0.0.0 --port 8123` (defaults:
   `127.0.0.1:8123`, or `MT5_BRIDGE_HOST`/`MT5_BRIDGE_PORT`).
4. Deploy or restart the route with `MT5_BRIDGE_URL=http://<bridge-host>:8123`.

Plan fields the bridge accepts: `symbol`, `direction`, `entry`, `stop`,
optional `take_profit`, `lot`, or `riskPercent` + `pipValuePerLot` (when `lot`
is absent it reads the live balance with `mt5.account_info()`), `digits`
(default 5), `pipSize`, `minLot`, `maxLot`, `lotStep`, `balance`, `magic`,
`comment`, `deviation`. It checks symbol volume min/max/step and refuses a lot
outside range or off the broker step, like the MQL research EA.

Bridge responses are JSON: `ok`, `retcode`, `retcode_description`, `ticket`,
`volume`, `price`, `sl`, `tp`, `symbol`, `direction`, `lot`. Invalid plans get
a 400 with an `error` message.

Checks: `python3 scripts/mt5_sender_test.py` runs 24 checks of the pure sizing
and planning helpers (no terminal needed); they also run through
`node --test test/mt5_sender.test.js` in `npm test`. End to end, the route was
exercised here with a stub bridge: it forwards the computed plan to
`MT5_BRIDGE_URL` and returns it as `mt5` in the route response.
