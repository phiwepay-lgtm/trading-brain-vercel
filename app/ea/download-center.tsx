'use client';

import { useState } from 'react';
import Link from 'next/link';

const sourcePath = '/ea/Dark_Orders_Pure_Price.pine';

export default function DownloadCenter() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function showCode() {
    setLoading(true);
    setCode('');
    setMessage('');
    try {
      const response = await fetch(sourcePath, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load the code. Please try the download instead.');
      const text = await response.text();
      if (!/^\/\/@version=5\r?\nindicator\("Dark Orders Pure Price \+ History \[Blackwatch\]"/.test(text)) {
        throw new Error('The source did not match the expected Pine script. Nothing was copied.');
      }
      setCode(text);
      setMessage('Code loaded. Replace all existing text in TradingView Pine Editor before pasting.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the code. Please try the download instead.');
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setMessage('Copied. Replace all existing text in Pine Editor, paste, save and add to chart.');
    } catch {
      setMessage('Clipboard access was blocked. Select and copy the code below manually.');
    }
  }

  return <main className="page">
    <header><span className="brand">TRADING BRAIN <span>/</span> DARK ORDERS</span><span className="tag">TRADINGVIEW · PINE V5</span></header>
    <section className="intro"><p className="eyebrow">PRICE ONLY / JOURNAL CONTEXT</p><h1>Dark Orders<span>.</span></h1><p>A price-only TradingView overlay highlighting unusual candle expansion, with a recent-signal recap.</p></section>
    <section className="card" aria-labelledby="script-title">
      <div className="card-heading"><div><p className="eyebrow">TRADINGVIEW INDICATOR</p><h2 id="script-title">Pure Price + History</h2><p>Dark Orders Pure Price + History [Blackwatch]</p></div><span className="tag">.PINE</span></div>
      <div className="details"><h3>How to read it</h3><p>Orange means both range and body meet their multiplier and 1.5 Z-score thresholds, without a directional DARK signal. Teal (DARK+ PURE) or red (DARK− PURE) also requires the Heikin Ashi body to exceed 1.2 times its 20-bar average and the chart candle to close bullish or bearish, respectively. Labels appear below bullish bars and above bearish bars.</p></div>
      <div className="details"><h3>History recap</h3><p>The optional table shows the latest 20 confirmed DARK+ and DARK− signals by default (adjustable to 1–100), newest first. Times are bar-open times in the symbol’s exchange timezone; prices are bar closes. Bottom counts cover all loaded chart history, not just the displayed rows or a particular day or week.</p></div>
      <div className="download"><div><strong>Dark_Orders_Pure_Price.pine</strong><p>50-bar lookback · range and body expansion · alerts</p></div><a className="button primary" href={sourcePath} download>Download Dark Orders</a></div>
      <div className="actions"><button type="button" className="button secondary" onClick={() => void showCode()} disabled={loading}>{loading ? 'Loading code…' : 'Show Dark Orders code'}</button>
        {code && <div className="code-panel"><p>In TradingView Pine Editor, select all existing text and replace it with this script. Then save and add to chart.</p><textarea aria-label="Dark Orders Pine code" value={code} readOnly spellCheck={false} onFocus={event => event.currentTarget.select()} /><button type="button" className="button secondary" onClick={() => void copyCode()}>Copy Dark Orders code</button></div>}
        <p className="status" role="status">{message}</p>
      </div>
      <aside><strong>Context, not a trading signal.</strong> Price expansion alone does not identify institutional or dark-pool orders, net buying or selling, or guarantee an entry. This script does not detect the 0.382 level. Heikin Ashi uses the chart timeframe; open-bar colors and conditions can change before close, so use once-per-bar-close alerts for confirmed bars. Historical colors and counts depend on loaded data and settings and are recalculated, not permanently saved. The table does not measure trade outcomes. This script has not been compiled or verified in TradingView.</aside>
    </section>
    <section className="card next-study"><p className="eyebrow">SEPARATE TRADINGVIEW STUDY</p><h2>Trend Predictor</h2><p>A closed-candle VWAP and volume-weighted EMA anchor for confluence with your own edge. No BUY or SELL signals; separate from Dark Orders.</p><Link className="button secondary" href="/trend-predictor">Open Trend Predictor</Link></section>
    <section className="card next-study"><p className="eyebrow">ONE SCRIPT / TWO STUDIES</p><h2>Dark Orders + Anchor</h2><p>TradingView and Indie draft downloads. The two calculations remain separate.</p><Link className="button secondary" href="/two-in-one">Open two-in-one</Link></section>
    <section className="card next-study"><p className="eyebrow">SEPARATE TRADINGVIEW / INDIE STUDY</p><h2>My Session Range</h2><p>Highlight your chosen session’s high and low. Separate from Dark Orders and the anchor.</p><Link className="button secondary" href="/session-range">Open My Session Range</Link></section>
    <section className="card next-study"><p className="eyebrow">SEPARATE MT5 STRATEGY TESTER DRAFT</p><h2>Supertrend HA EA</h2><p>Partial M1 Heikin Ashi research EA, dashboard and template-save helper. Tester only; not a full Pine port.</p><Link className="button secondary" href="/supertrend-tester">Open Supertrend tester</Link></section>
    <section className="card next-study"><p className="eyebrow">TRADINGVIEW / INDIE DRAFT</p><h2>NQ Volume Profile</h2><p>A developing chart-volume approximation from 4:00 p.m. New York time, two hours before the futures open.</p><Link className="button secondary" href="/nq-volume-profile">Open NQ Volume Profile</Link></section>
    <footer>TRADING BRAIN / DARK ORDERS <span>NOT FINANCIAL ADVICE</span></footer>
  </main>;
}
