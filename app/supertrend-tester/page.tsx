import Link from 'next/link';

export default function SupertrendTesterPage() {
  return <main className="page">
    <header><Link className="brand" href="/">TRADING BRAIN <span>/</span> DARK ORDERS</Link><span className="tag">MT5 · TESTER ONLY</span></header>
    <section className="intro"><p className="eyebrow">M1 HEIKIN ASHI / RESEARCH DRAFT</p><h1>Supertrend EA<span>.</span></h1><p>A partial, tester-only translation of your Supertrend script, with a simple on-chart dashboard.</p></section>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">METATRADER 5 STRATEGY TESTER</p><h2>Research package</h2><p>Source code, install notes and a template-save helper.</p></div><span className="tag">SOURCE · ZIP</span></div>
      <div className="details"><h3>What is included</h3><p>The EA calculates synthetic M1 Heikin Ashi from completed broker candles and checks Supertrend reversals. The dashboard shows trend, ATR, ADX, EMA 200 and the latest signal; chart lines show the latest synthetic entry, stop and TP1/TP2/TP3 study levels. The template helper saves a layout you first create in MetaTrader; it is not a precompiled template.</p></div>
      <div className="details"><h3>Testing orders</h3><p>Orders are disabled by default, and the EA refuses to start outside Strategy Tester. When explicitly enabled, it opens one fixed-lot tester position with SL and a full exit at TP1 only. Real bid/ask is used for simulated fills, so order prices differ from synthetic Heikin Ashi study levels. TP2 and TP3 are visual only.</p></div>
      <div className="download"><div><strong>Supertrend_HA_Tester_Research.zip</strong><p>EA source · core · template helper · instructions</p></div><a className="button primary" href="/ea/Supertrend_HA_Tester_Research.zip" download>Download MT5 research package</a></div>
      <aside><strong>Not a complete port.</strong> The original trade-history and win-rate tables, multi-timeframe dashboard, re-entries, breakouts, trendlines, channels, zones and partial TP handling are not implemented. Existing positions are not reversed. MT5 compilation, template creation, Pine equivalence and profitability are unverified. Broker costs, spreads, data and tester configuration affect results. Do not use for live or demo trading.</aside>
      <div className="details"><h3>Getting started</h3><p>Extract the ZIP into your MT5 data folder, compile the EA and template helper in MetaEditor, and run the EA on M1 in Strategy Tester visual mode with orders disabled first. The package README has exact steps and limitations. Attach MT5’s Heiken Ashi indicator, if available, for a visible HA overlay; the EA’s internal HA calculation does not require it.</p></div>
    </section>
    <footer>TRADING BRAIN / SUPERTREND RESEARCH <span>NOT FINANCIAL ADVICE</span></footer>
  </main>;
}
