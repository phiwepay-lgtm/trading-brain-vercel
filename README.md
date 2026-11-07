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
