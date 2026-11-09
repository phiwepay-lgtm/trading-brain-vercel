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

The separate `/session-range` page offers a Pine v6 adaptation and an Indie v5 draft of the supplied Blackwatch Advisory - My Session Range (itself a modification of RobMinty's FXN - Asian Session Range). Both track the latest observed session only. Defaults are 03:00–07:00 fixed EST (UTC−5), with an explicit timezone replacing the supplied script's hard-coded broker offset. Choose America/New_York for Eastern time with daylight saving; Indie uses IANA `Etc/GMT+5` for fixed EST. The range can change while forming and uses bars whose open falls within the session. Missing data or bars crossing session boundaries affect the range. The Pine draft is limited to intraday charts up to one hour and projects the box to the scheduled end; the Indie draft uses the first and last observed session bar and does not project forward. Both are uncompiled in their target environments and may differ from the original or each other.
