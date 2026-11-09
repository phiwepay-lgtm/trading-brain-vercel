'use client';

import Link from 'next/link';
import { useState } from 'react';

const files = {
  pine: { title: 'TradingView Pine', path: '/ea/Dark_Orders_Trend_Predictor.pine', first: '//@version=6', filename: 'Dark_Orders_Trend_Predictor.pine' },
  indie: { title: 'Indie draft', path: '/ea/Dark_Orders_Trend_Predictor.indie.txt', first: '# indie:lang_version = 5', filename: 'Dark_Orders_Trend_Predictor.indie.txt' },
};

type FileKey = keyof typeof files;

function Source({ kind }: { kind: FileKey }) {
  const file = files[kind];
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  async function show() {
    setLoading(true); setCode(''); setMessage('');
    try {
      const response = await fetch(file.path, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load the file; use the download link instead.');
      const text = await response.text();
      if (!text.startsWith(file.first + '\n')) throw new Error('Unexpected source file. Nothing was copied.');
      setCode(text); setMessage('Loaded. Select all existing editor text before pasting.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load the file.'); }
    finally { setLoading(false); }
  }
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code); setMessage('Copied. Replace the editor contents before pasting.');
    } catch { setMessage('Clipboard access blocked. Select and copy the code below manually.'); }
  }
  return <div className="details"><h3>{file.title}</h3><div className="download"><div><strong>{file.filename}</strong></div><a className="button primary" href={file.path} download>Download {file.title}</a></div>
    <div className="actions"><button className="button secondary" type="button" disabled={loading} onClick={() => void show()}>{loading ? 'Loading…' : `Show ${file.title} code`}</button>
      {code && <div className="code-panel"><p>Replace all text in your editor with this one script.</p><textarea aria-label={`${file.title} code`} value={code} readOnly spellCheck={false} onFocus={event => event.currentTarget.select()} /><button className="button secondary" type="button" onClick={() => void copy()}>Copy {file.title} code</button></div>}
      <p className="status" role="status">{message}</p></div>
  </div>;
}

export default function CombinedIndicators() {
  return <main className="page"><header><Link className="brand" href="/">TRADING BRAIN <span>/</span> DARK ORDERS</Link><span className="tag">TWO IN ONE</span></header>
    <section className="intro"><p className="eyebrow">DARK ORDERS / ANCHOR</p><h1>Two in one<span>.</span></h1><p>One indicator per platform. Dark Orders and the Trend Predictor anchor remain independent.</p></section>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">TRADINGVIEW / INDIE</p><h2>Choose your platform</h2><p>Use standard candles when comparing the two scripts.</p></div></div>
      <Source kind="pine" /><Source kind="indie" />
      <aside><strong>Important differences and verification.</strong> The Pine version retains the Dark Orders history table and alerts. The Indie version is an uncompiled draft: it omits the history table and alert conditions, and reconstructs Heikin Ashi from chart OHLC. Indie platform support, compile success and chart behavior have not been verified. Session VWAP, feed volume, history and Heikin Ashi data can differ between platforms. The anchor appears only on closed candles; Dark Orders colors and labels can change while a candle is open. Data revisions can alter historical results.</aside>
      <p className="attribution">Anchor adapted from Zeiierman’s Rolling Candle Profile under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a> (noncommercial, share alike).</p>
    </section><footer>TRADING BRAIN / TWO IN ONE <span>NOT FINANCIAL ADVICE</span></footer></main>;
}
