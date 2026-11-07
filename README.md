# Trading Brain

A standalone Next.js dashboard for the M5 BOS → 0.382 → M1 VLB + Engulf system. It is Vercel-ready and does not connect to MT5, scan markets or place trades. Optional chart markers can be loaded from a journal JSON locally in the browser.

## Current data and privacy

- `data/brain.json` contains the rules supplied for this build. Its `source` is the requested provenance label; the encrypted learned-system file was **not** read or decrypted to independently verify those rules.
- `data/journal_summary.json` is awaiting a verified 33-trade export. All performance figures are `null`, not estimates or zeroes. The separate 40-record recovery export was rejected because outcome and P&L fields disagree; it was not used to calculate performance.
- The local journal is described by its repository as local-only and encrypted. No raw journal, screenshots, encrypted files, or keys are copied into this project.
- `/api/status` deliberately returns `mt5_connected: false` and `scanning: false`. There is no live integration.

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

Import this Git repository into Vercel, select the **Next.js** framework preset and deploy. The offline pages require no environment variables; chart market data and image assessment require the separate configuration described below. Set the build command to `npm run build` and the install command to `npm install`. Leave the output directory override unset so Vercel uses the Next.js default. `vercel.json` identifies the project as Next.js. The app uses Next.js 16; downgrading to Next.js 14 is not needed for deployment and would introduce known security advisories.

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

`/chart` is the default page. It uses Lightweight Charts 4.2.x: M5 defaults to Heiken Ashi and a blue EMA 21, M1 defaults to normal candles and a yellow EMA 9. EMA is calculated from **real OHLC closes**, not synthetic Heiken Ashi closes; the HA close is not the market last. Toggle candle type and EMA separately in each pane. Pan and crosshair sync are time-based and can be switched off. M5 is above M1 on small screens. Each pane has drawing tools, a screenshot download and earlier-candle loading; drawings remain in that browser's localStorage and can be copied from M1 to M5. Clearing browser site data removes them.

### Configure real data

The project currently has **no market-data credentials configured**, so both charts correctly show no data. The implementation uses Twelve Data, not MT5 or the broker's feed. Configure all of the following in Vercel for the desired Preview/Production environments, then redeploy:

- `TWELVE_DATA_API_KEY`: a server-only Twelve Data key with historical intraday and streaming entitlements for each desired instrument (XAU/USD, EUR/USD, BTC/USD). Provider plans, exchange selection, latency, history limits, bid/ask availability, usage limits and charges vary; verify them with the provider. Never use a `NEXT_PUBLIC_` prefix or enter this key in the browser or chat.
- `CHART_ACCESS_TOKEN`: a long random value of at least 24 characters. Enter this **access token**, not the provider key, in the chart page. It stays in browser `sessionStorage` and is sent via authorization headers, not URLs. Anyone with the token can consume your provider credits; use Vercel access controls and appropriate distributed rate limiting / spending limits for broader access. This token is not a substitute for user authentication.

The server fetches up to 500 provider candles per timeframe (`/api/chart/candles?symbol=XAUUSD&timeframe=M1`; use `before=<Unix seconds>` for earlier candles). Volume is `null` if the provider does not supply it. `/api/chart/price?symbol=XAUUSD` returns a provider REST snapshot with `bid`/`ask` null if not supplied; it is not an atomic snapshot of the charts. All three chart endpoints require the bearer token. `/api/chart/stream` keeps the provider key on the server: it connects to Twelve Data's WebSocket and relays ticks to the browser as same-origin SSE. The latest accepted tick drives the displayed ticker and M1 close; M5 is updated from the M1 candle. Bid and ask are shown only when supplied on that tick, without offsets.

The stream reconnects periodically to fit serverless execution limits and refreshes history on reconnect. There can still be gaps between snapshots and subscriptions, provider delays, limited history, disconnected streams, and unverified exchange differences. A single user may consume a provider WebSocket connection and repeated REST requests; Twelve Data may limit concurrent connections. No 60 fps, gap-free, broker/MT5, TradingView price-parity or production streaming guarantee is claimed. The ticker reports its last tick time and becomes stale when no recent ticks arrive. Until a real entitled account is configured and tested, neither real-time updates nor live bid/ask accuracy has been verified.

### Journal markers

The optional JSON is read **only in the browser's memory**; it is not uploaded to this server, stored by the app or used for statistics. Clear it or reload to remove it. Supported input is an array or `{ "trades": [...] }`. A trade needs `symbol`, `side` (`BUY`/`SELL`), `entry_time`, and `entry_price`; optional `exit_time`, `exit_price` and numeric `pnl` add an exit label. Times must be Unix seconds/milliseconds or ISO 8601 strings with an explicit timezone. Common camelCase names and `direction`, `open_time`, `close_time`, `entry`, `exit`, and `profit` are also accepted. Incomplete or other-symbol trades are skipped, not guessed. Points are placed at the stated price and the containing candle's time; a marker is visible only when its time and price are within loaded chart data. This schema has not been tested against the user's future export.

```sh
npm run build
npm run test:chart  # local, test-only mocked provider; no real feed validation
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

## MT5 EA download center

`/ea` provides `TradingBrain.mq5` and `README.txt`; `/ea/guide` contains an illustrated **text** walkthrough (not screenshots of the MT5 application). The EA polls `/api/signal`, which currently always returns `HOLD`. Chart assessments are not connected to this endpoint. The sample EA is **disabled by default**, defaults to demo accounts, checks spread, SL/TP, symbol, signal expiry and replay, blocks new orders if the symbol already has an open position, and attaches the signal's stop and target. It does not trail or actively manage exits. The fixed 0.1 lot default does **not** enforce the 0.5–1% risk rule.

This environment cannot compile MQL5 or connect to an MT5 broker, so the EA has not been compiled, broker-tested or security-reviewed. It does not authenticate signals. A future signal source and the EA's signal authentication must be independently designed and tested before any real trading; do not enable live trading based on the sample. The download guide explains MetaEditor compilation, WebRequest permissions, and demo testing. MT5 connection and scanning remain false in the brain/status APIs.
