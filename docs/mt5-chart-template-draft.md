# Trading Brain visual template — unverified draft

`TradingBrain_Visual_Draft.tpl` is a **hand-authored visual-only template draft** using the text structure seen in MT5 chart templates. It was not produced by MetaTrader, and it has not been opened or validated in an MT5 terminal. It may not load or may render differently depending on the terminal build; do not describe it as a verified or native-generated template.

The draft requests a dark M1 candlestick chart. It contains **no attached EA, custom indicators, account settings, strategy or trade permissions**. In particular it does not automate or contain the Trading Brain edge. The separate `TradingBrain_Tester_v153.mq5` source and its `.set` input presets are still needed for Strategy Tester; that EA is disabled on live and demo accounts. The TradingView indicator and strategy cannot be attached to MT5.

## Try it on a suitable MT5 installation

1. Copy the `.tpl` file into the terminal's `MQL5/Profiles/Templates/` folder, available via **File → Open Data Folder**. The MT5 Strategy Tester kit is a separate download and does not contain this draft template.
2. On a non-trading chart or a Strategy Tester visual chart, right-click → **Template → Load Template** and select `TradingBrain_Visual_Draft`. If it does not load, do not assume the chart was configured: arrange a standard M1 candlestick chart manually.
3. Verify M1, candlesticks, colours and the absence of unwanted EAs or indicators. Then use **Template → Save Template** inside MT5 to produce a real terminal-generated `.tpl` that you can reuse. `ChartSaveTemplate` is MetaTrader's documented API for generating a template. Templates can retain attached programs, so inspect the chart and permissions before saving or applying one.
4. For actual Trading Brain research, compile the separate EA in MetaEditor, then run it in MT5 **Strategy Tester only** with the `.set` input preset of your choice. Both simulated-order gates default off. The template does not compile the EA, enable a connection, provide market history, or prove an edge.

No MT5 installation is required to use the separate browser `/tester`. Source and further documentation: [MetaTrader chart templates and profiles](https://www.metatrader5.com/en/terminal/help/charts_advanced/templates_profiles) and [MQL5 ChartSaveTemplate](https://www.mql5.com/en/docs/chart_operations/chartsavetemplate).
