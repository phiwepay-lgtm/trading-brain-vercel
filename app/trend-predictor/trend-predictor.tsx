'use client';

import Link from 'next/link';
import { useState } from 'react';

const sourcePath = '/ea/Trend_Predictor.pine';

export default function TrendPredictor() {
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
      if (!/^\/\/@version=6\r?\n/.test(text) || !text.includes('indicator("Trend Predictor — Anchor (Zeiierman)"')) {
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
    <header><Link className="brand" href="/">TRADING BRAIN <span>/</span> DARK ORDERS</Link><span className="tag">TRADINGVIEW · PINE V6</span></header>
    <section className="intro"><p className="eyebrow">ANCHOR / CONFLUENCE</p><h1>Trend Predictor<span>.</span></h1><p>A standalone anchor line for confluence with your own trading edge.</p></section>
    <section className="card" aria-labelledby="script-title">
      <div className="card-heading"><div><p className="eyebrow">TRADINGVIEW INDICATOR</p><h2 id="script-title">Anchor only</h2><p>Adapted from Rolling Candle Profile with Buy/Sell Signals by Zeiierman.</p></div><span className="tag">.PINE</span></div>
      <div className="details"><h3>Your edge, your decision</h3><p>The anchor is for confluence. There are no BUY or SELL signals, alerts, labels or pressure bands. The default anchor is an equal blend of VWAP and the volume-weighted 21 EMA: EMA(close × volume) divided by EMA(volume). The EMA length is adjustable. Chart volume is needed; the blend is hidden when current-bar volume or a component is unavailable. You can also select EMA, SMA, VWMA, VWAP or Donchian Mid. Standalone VWMA and VWAP fall back to EMA if unavailable; Donchian Mid uses the preceding completed window.</p></div>
      <div className="details"><h3>Closed candles</h3><p>The anchor and optional glow appear only when the chart candle closes. Volume availability and meaning vary by feed; volume may be tick volume rather than centralized traded volume. The line is not shown on the developing candle. Colors indicate whether the anchor is rising or falling; they are not trade signals.</p></div>
      <div className="download"><div><strong>Trend_Predictor.pine</strong><p>Closed-bar anchor · optional glow · no signals</p></div><a className="button primary" href={sourcePath} download>Download Trend Predictor</a></div>
      <div className="actions"><button type="button" className="button secondary" onClick={() => void showCode()} disabled={loading}>{loading ? 'Loading code…' : 'Show Trend Predictor code'}</button>
        {code && <div className="code-panel"><p>In TradingView Pine Editor, select all existing text and replace it with this script. Then save and add to chart.</p><textarea aria-label="Trend Predictor Pine code" value={code} readOnly spellCheck={false} onFocus={event => event.currentTarget.select()} /><button type="button" className="button secondary" onClick={() => void copyCode()}>Copy Trend Predictor code</button></div>}
        <p className="status" role="status">{message}</p>
      </div>
      <aside><strong>Repainting limits.</strong> Closed-candle display prevents the developing candle’s anchor from changing on the chart. It cannot prevent differences after data-provider corrections, changes in loaded history, chart type or settings. This adaptation has not been compiled or verified in TradingView.</aside>
      <p className="attribution">Original work © Zeiierman, adapted under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a> (noncommercial, share alike).</p>
    </section>
    <footer>TRADING BRAIN / TREND PREDICTOR <span>NOT FINANCIAL ADVICE</span></footer>
  </main>;
}
