# Trading Brain

A standalone Next.js dashboard for the M5 structure → 0.382 → M1 VLB sell / VHB buy + engulf system. It is Vercel-ready and does not connect to MT5, scan markets or place trades. An optional journal can be uploaded for a browser-local table and chart navigation.

## Current data and privacy

- `data/brain.json` contains the rules supplied for this build. Its `source` is the requested provenance label; the encrypted learned-system file was **not** read or decrypted to independently verify those rules.
- `data/journal_summary.json` is awaiting a verified 33-trade export. All performance figures are `null`, not estimates or zeroes. The separate 40-record recovery export has inconsistent outcome and P&L fields and is not used for the verified summary. If uploaded, its recorded values may be displayed as explicitly unverified browser-local descriptive statistics.
- No raw journal, screenshots, encrypted files, or keys are committed to this project. The optional upload sends the JSON to the app for transient validation and persists it in browser localStorage; see the privacy note below.
- `/api/status` deliberately returns `mt5_connected: false` and `scanning: false`. There is no MT5 integration.

**Deployment privacy:** the dashboard and API routes are public unless you configure access controls. The brain rules and any committed aggregates will be visible to visitors. Do not add journal records, notes, credentials, or encrypted files to this repository. This is not financial advice.

## Local development

Requires Node.js 20.9 or newer.

```sh
npm ci
npm run dev
# http://localhost:3000
npm test
npm run build
```

## API

- `GET /api/brain` returns `data/brain.json`.
- `GET /api/status` returns `{ "mt5_connected": false, "scanning": false }`.

## Verified data (optional, local only)

`scripts/summarize_journal.py` can produce aggregate-only data from a plaintext JSON file containing **exactly 33 already-validated trades**. Keep the file outside the project; the script does not decrypt files or decide which trades are valid.

```sh
python3 scripts/summarize_journal.py /path/to/prevalidated-33.json --prevalidated
```

The script refuses a different count, invalid flags, unrecognized or conflicting outcomes and P&L. It uses wins / (wins + losses) as the primary win rate, with a separate rate including breakevens; zero denominators result in `null`. The subgroup labels are matched exactly (case and whitespace insensitive): `entryType` = `BT 0.382`, `exec` = `VLB + Engulf Trigger`. Confirm these conventions match the source before using them. Inspect the aggregate and methodology before deploying. Rebuild or redeploy after updating the summary.

## Deploy to Vercel

Import this Git repository into Vercel, select the **Next.js** framework preset and deploy. The chart can run with a clearly labeled demo feed without environment variables; live Twelve Data and image assessment require the separate configuration described below. Set the build command to `npm run build` and the install command to `npm install`. Leave the output directory override unset so Vercel uses the Next.js default. `vercel.json` identifies the project as Next.js. The app uses Next.js 16; downgrading to Next.js 14 is not needed for deployment and would introduce known security advisories.

## Monitoring dashboard

The root page redirects to `/chart`; `/dashboard` remains the monitoring page and `/playbook` retains the system rules and journal summary. The dashboard polls `/api/status`, `/api/trades`, and `/api/logs` every three seconds while open (pause and manual refresh are available). All endpoints are same-origin, read-only and send `Cache-Control: no-store`.

- `/api/status` reports disconnected / not scanning, with unknown bot state, last-trade time and P/L until there is a real integration. Unknown is not a claim that an external bot is off.
- `/api/trades` returns an empty unavailable feed, not sample trades.
- `/api/logs` reports an actual diagnostics request; the dashboard keeps the most recent 50 diagnostic and manual API-check events **in that browser session only**. It is not a persistent, shared, broker, or bot log stream. A real MT5 adapter, secure storage and a log ingestion service are still required for live trade data and persistent bot logs.
- The Status API and Brain API test buttons show the actual JSON response, loading state and error feedback. Status cards, navigation, refresh, pause/resume and clear controls provide click feedback.

The existing layout contains no full-page app overlay; informational panels in the old view were not buttons. The Vercel toolbar is external to the app and has not been verified as the source of the reported production issue. The app does not automatically disable account-level deployment protection or the toolbar.

### Browser tests

```sh
npm run build
npx playwright install chromium  # once, plus system dependencies as needed
npm run test:e2e
```

Tests cover desktop/mobile navigation and controls, automatic diagnostics polling, API responses and status API failure handling.

## Dual chart workspace

`/chart` uses Lightweight Charts 4.2.x. M5 defaults to Heiken Ashi with a blue EMA 21; M1 defaults to normal candles with a yellow EMA 9. EMA uses the selected feed's non-HA closes. Pan and crosshair sync, drawings and screenshots are available. The default data source order is:

1. Twelve Data, if a server key and (when configured) access token allow it.
2. Binance public REST for XAUUSD → **PAXG/USDT** and BTCUSD → **BTC/USDT**. These are different markets, not spot XAU/USD or BTC/USD, and USDT is not USD. Forex EUR/USD has no Binance proxy. Proxy prices are polled, not streamed. Binance may be unavailable in some regions, including Vercel's deployment region.
3. A deterministic **simulated demo feed** if no provider is available, or immediately when “Skip - Use Demo” is selected. Demo data has a yellow notice and watermark on both panes, is not actual market data, and is not for trading. Demo bid/ask is unavailable rather than invented. Its historical M5 bars are aggregated from the same synthetic M1 series; the browser generates subsequent demo ticks.

Data source and proxy instrument are exposed in `X-Chart-Source` and `X-Chart-Instrument` headers. `/api/chart/candles` and `/api/chart/price` choose a fallback automatically; passing `source=twelvedata|binance|demo` pins a source and returns an error instead of mixing sources. The client pins both panes and the price to one source, and switches both to demo if that source fails. `/api/chart/price` is a snapshot, not an atomic quote with either chart. All feeds can have gaps, delays and provider-specific pricing. The demo and proxy feeds do not verify or match MT5/broker pricing.

To use Twelve Data, set `TWELVE_DATA_API_KEY` in Vercel with the relevant historical and streaming entitlements, then redeploy. `CHART_ACCESS_TOKEN` is **optional**: if set, it must be at least 24 characters, and the user enters it in the chart page; without a valid token the app uses the public proxy/demo instead of exposing the paid provider. If not set, anyone can consume the paid provider's quota. For production, set a token and additional access controls, distributed rate limits and spending limits. Never enter the provider key in the browser or chat. Vercel relays Twelve Data's WebSocket via same-origin SSE. If the stream fails or yields no initial tick within 15 seconds, the workspace switches to demo (including during quiet markets). Serverless execution, gaps, plan entitlements, latency, rate limits and fees remain provider-dependent. No real feed was verified in the test environment.

### Journal upload and privacy

Upload a JSON array, an object with a `trades` array, or a recovery object whose `trades` field is itself a JSON-encoded array. A maximum of 10,000 trade objects and a 4 MB file are accepted. The selected file is sent to `/api/journal/upload` for transient validation; the server returns `{count, trades}` and does not intentionally store or log the journal. Network/platform logs or provider policies may still apply. The original JSON, including notes and screenshots, is stored **unencrypted in browser localStorage**, visible to anyone with access to that browser profile or same-origin scripts. Do not upload on a shared device. Use “Clear journal” to remove it. Storage quotas can prevent a large upload; the previous journal is retained on failure. “View Raw JSON” exposes the original upload on screen.

The chart and monitor show the browser's uploaded journal with shared, browser-local filters and pagination. Brain Learning Status computes **descriptive, unverified** arithmetic from the uploaded fields only; it is not the verified 33-trade summary or automated model learning. The 40-record recovery export has inconsistent outcome/P&L/R fields; the UI flags conflicting records and shows missing counts rather than repairing them. Full TP rate counts explicit Full TP labels divided by all uploaded records; a `win` label without an explicit Full TP status is not assumed to mean Full TP. Recorded win rates both including and excluding breakevens/unknown are shown separately. BE/loss rates use recorded labels divided by all records, so they need not add up to 100% with Full TP. Sums and averages use only finite fields and show their denominators. Profit factor is positive recorded P/L divided by absolute negative recorded P/L, unavailable when no gross loss is present; expectancy is mean recorded P/L per available P/L field. P/L units/currencies are not verified. Grouped win rates are explicit Full TP divided by group size. Best combinations and hours rank by average recorded R, not predictive significance; hour/session are recorded labels and no timezone is inferred. Group buttons filter the journal; filters also apply to chart markers.

The R:R Optimizer uses **all uploaded records**, not the table filters. It assigns explicit Full TP = +X R, explicit SL/Stop Loss = −1 R, and explicit BE/Break Even = 0 R; generic win/loss labels alone are excluded, as are conflicting outcome/status labels. The UI reports excluded records and sign inconsistencies. The break-even win rate is 1/(1+X) for decisive trades before costs. This is a fixed-outcome hypothetical, not a backtest: it assumes the same trades reach every target. If there is any Full TP, 1:7 mechanically maximizes the scenario; if none, all ratios tie. It cannot identify a genuinely optimal tested target without historical price-path/outcome data at each target. With no eligible records, scenario R and the maximum are unavailable. The text exporter uses the selected hypothetical target and user-proposed GOLD, New York 14:00–16:00, BT/FTB 0.382 continuation filters. The NY timezone is a proposed filter, not an inference about recorded journal hours. The user now proposes either a $3 XAUUSD price-distance stop or an ATR stop; the choice, ATR parameters and validation remain unspecified. Neither stop is implemented automatically. Export is generated in the browser and does not include raw trades.

VLB is the user-defined Visual Low Break for sells; VHB is Visual High Break for buys. Both enter on the engulfing candle after M5 confirmation and the respective M1 break; see the execution breakdown tooltips or system exporter for the full rules. The chart does **not** detect these patterns in candles; it displays recorded journal labels. VLB sells are red downward triangles, VHB buys green upward triangles, and recorded FTB entries orange direction-based triangles. If VLB/VHB labels conflict with direction, markers are neutral and explicitly identify the conflict; unclassified entries remain generic buy/sell markers.

The Show My Trades toggle displays buy/sell triangles at the containing M1/M5 candle for filtered records with supported symbol, direction, and an explicit valid `openedAt` timestamp. Hover over a marker or its candle for recorded setup/P&L/R/status; the marker list is keyboard-accessible. Only markers whose candle is loaded appear, so select a journal row or load history to see older entries. Date-only records are not plotted as entry markers; selecting their rows highlights the start of the UTC day and explicitly notes that the time is unknown. On demo and proxy charts the triangles are time annotations on simulated/different-market candles, **not execution prices**, and the selected trade remains a vertical time highlight. They are not a trade feed and do not change the `mt5_connected=false` and `scanning=false` status. Drawings are stored separately in browser localStorage.

```sh
npm run build
npm run test:chart  # test-only mocked providers and synthetic fixtures; not real feed verification
```

## Chart assessment

`/brain` accepts up to five PNG/JPEG charts (3 MB maximum each), sends each image to `/api/brain/analyze` and shows a structured assessment. Each request is a **separate assessment**: the app does not combine multiple charts into one multi-timeframe analysis. Results and compressed thumbnails for up to 10 successful assessments are saved in the browser's `localStorage`; use Clear history to remove them. They are visible to anyone using that browser profile. The original files are not committed or stored by this app; images are transmitted to OpenAI and are subject to the provider's own data policies.

Configure these Vercel environment variables and redeploy before using the analysis endpoint:

- `OPENAI_API_KEY`: your OpenAI API key, entered in Vercel's environment-variable settings, never in the repository or chat.
- `BRAIN_ACCESS_TOKEN`: a long, randomly generated access token of **at least 24 characters**. Enter the same token in the assessment page each session. The app keeps it only in page memory. Don't commit it or send it in chat. It gates the endpoint but does not replace Vercel access controls, cost limits, monitoring or rate limiting; configure those separately before broad use.
- `OPENAI_VISION_MODEL` (optional): defaults to `gpt-4o-mini`; select a vision-capable model that supports structured JSON output in your OpenAI account.

Without both secrets the endpoint returns a clear 503 rather than inventing a result. Each image request requires the bearer token, and the server verifies its type, signature and size. AI confidence is an uncalibrated estimate; it is **not** a win probability. Unknown prices and missing confirmations are shown as unavailable, and incomplete assessments are forced to SKIP. Even TAKE means only a visual match for manual review, never an order or a guarantee.

To test the server-side validation without an OpenAI key or network request:

```sh
npm run build
npm run test:vision
```

This runs a local test-only mocked OpenAI response. Browser tests mock the provider too; neither test verifies a real provider account.

## MT5 and Pine visual scanner sources

`/ea` provides `TradingBrain.mq5`, `TradingBrain_GOLD_M1_VLB_VHB.pine` and `README.txt`. Both scanners are **disabled by default**, visual only, and contain no order or network functions. The app endpoint `/api/signal` remains HOLD and the website does not connect to MT5 or run scans. The MQL source has not been compiled or broker-tested; the Pine source has not been compiled in TradingView. No EX5 is supplied.

When enabled on an M1 chart, both sources use the previous completed M5 candle and the preceding 50-bar M5 range. The close above the high-minus-0.382 level gives a bearish proxy; close below low-plus-0.382 gives a bullish proxy; otherwise neutral. The BT/FTB labels are **bias proxies**, not detection of the real break-test or failure-to-break. The M1 visual candidate is an opposite-color body engulfing the previous body at or beyond the preceding five bars' high (sell) or low (buy). It requires contiguous, completed M1 candles. This deliberately simple candidate is **not** confirmation of the earlier specified BOS/CHoCH, pullback, engulf-to-new-low/high, or M5 structural sequence. Inputs permit changing lookbacks and turning off the M5 filter; disabling the filter explicitly permits unfiltered candidates. Neutral or missing M5 data with the filter on yields HOLD. Pine uses non-repainting completed M5 values; MT5 uses the same M1 bar-open alignment. Both can differ due to feeds and historical data.

Pine draws two 80%-transparent bands at the formula levels and a top-right dashboard; MT5 uses outlined rectangles. The band half-width is a configurable visual tick/point padding, not a measured zone, FVG, or stop. The Pine table's 40/PF 4.76/WR 27.5% row is a fixed **user claim**, not verified performance and not read from the uploaded journal. The conflicting NY 17:00 and earlier 14:00–16:00 claims remain unverified.

### Full package

The dashboard's **Download EA Package (ZIP)** and Download Center's **Download Full Package (ZIP)** assemble the same four source files in the browser: `TradingBrain.mq5`, `TradingBrain_GOLD_M1_VLB_VHB.pine`, `system.json` and `README.txt`. The dashboard includes its hypothetical R:R selection; the Download Center does not access that slider. `system.json` contains aggregate-only descriptive statistics from the browser journal, never raw records; it reports unavailable data if no journal is uploaded. The figures are not broker-verified and do not replace the verified 33-trade summary. R:R calculations remain hypothetical, not a backtest.
