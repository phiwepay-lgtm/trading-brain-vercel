# Dark Orders — Pure Price + History

This project retains the standalone price-only Dark Orders TradingView overlay and its download/preview page. It is for journaling and context, not an automated trading system. The indicator is not verified in TradingView and does not identify institutional or dark-pool orders.

## Run locally

```sh
npm ci
npm run dev
```

Open `/` or `/ea` to download or copy the Pine source. In TradingView's Pine Editor, **replace all existing code** with the script before saving and adding it to a chart. The source is `public/ea/Dark_Orders_Pure_Price.pine` and has been retained unchanged.

Check changes with `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Browser tests use `npm run test:e2e` after installing Playwright Chromium and running a production build.
