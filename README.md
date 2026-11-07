# Trading Brain

A standalone Next.js dashboard for the M5 BOS → 0.382 → M1 VLB + Engulf system. It is Vercel-ready and does not connect to MT5, scan markets, place trades, or access the journal.

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

Import this Git repository into Vercel, select the **Next.js** framework preset and deploy. No environment variables or external services are required. Set the build command to `npm run build` and the install command to `npm install`. Leave the output directory override unset so Vercel uses the Next.js default. `vercel.json` identifies the project as Next.js. The app uses Next.js 16; downgrading to Next.js 14 is not needed for deployment and would introduce known security advisories.

## Monitoring dashboard

The root page redirects to `/dashboard`; `/playbook` retains the system rules and journal summary. The dashboard polls `/api/status`, `/api/trades`, and `/api/logs` every three seconds while open (pause and manual refresh are available). All endpoints are same-origin, read-only and send `Cache-Control: no-store`.

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
