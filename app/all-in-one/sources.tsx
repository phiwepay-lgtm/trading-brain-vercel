'use client';

import Link from 'next/link';
import { useState } from 'react';

const file = { title: 'All In One (Pine)', path: '/ea/All_In_One.pine', first: '//@version=6', filename: 'All_In_One.pine' };

export default function AllInOne() {
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
  return <main className="page"><header><Link className="brand" href="/">TRADING BRAIN <span>/</span> DARK ORDERS</Link><span className="tag">ALL IN ONE</span></header>
    <section className="intro"><p className="eyebrow">ONE SCRIPT / FOUR STUDIES</p><h1>All in one<span>.</span></h1><p>Dark Orders, the Trend Predictor anchor, My Session Range and the NQ volume profile combined into a single TradingView indicator for a Basic plan.</p></section>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">TRADINGVIEW PINE</p><h2>One saved script</h2><p>Each study keeps its own input group and can be switched off, so you only run what you need.</p></div><span className="tag">.PINE</span></div>
      <div className="details"><h3>What is included</h3><p>Dark Orders Pure Price + History, the Trend Predictor anchor (Zeiierman, CC BY-NC-SA 4.0), the My Session Range developing high/low, and the NQ Developing Volume Profile approximation. Each is independent; the anchor is not a filter for Dark Orders.</p></div>
      <div className="details"><h3>Basic plan limits</h3><p>TradingView Basic allows one saved script per chart and a 20-second calculation window. If the chart is slow, turn off the NQ profile or the session range from their input groups. The NQ profile is the heaviest and only draws on the last bar.</p></div>
      <div className="download"><div><strong>{file.filename}</strong><p>Dark Orders · Anchor · Session · NQ profile</p></div><a className="button primary" href={file.path} download>Download All In One</a></div>
      <div className="actions"><button className="button secondary" type="button" disabled={loading} onClick={() => void show()}>{loading ? 'Loading…' : `Show ${file.title} code`}</button>
        {code && <div className="code-panel"><p>Replace all text in your editor with this one script.</p><textarea aria-label={`${file.title} code`} value={code} readOnly spellCheck={false} onFocus={event => event.currentTarget.select()} /><button className="button secondary" type="button" onClick={() => void copy()}>Copy {file.title} code</button></div>}
        <p className="status" role="status">{message}</p></div>
      <aside><strong>Verification and differences.</strong> This single script has not been compiled or verified in TradingView. PineTS executed its plots without error, but that is not the TradingView compiler. The combined NQ status table is placed bottom-right to avoid overlapping the Dark Orders recap. Dark Orders colors/labels can change before close, and the anchor draws only on confirmed candles. Data revisions and loaded history can still alter past values.</aside>
      <p className="attribution">Anchor adapted from Zeiierman’s Rolling Candle Profile under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a> (noncommercial, share alike).</p>
    </section>
    <section className="card next-study"><p className="eyebrow">SEPARATE STUDIES</p><h2>Keep the originals</h2><p>The standalone and two-in-one versions remain available if you prefer one study per chart.</p><Link className="button secondary" href="/two-in-one">Open two-in-one</Link></section>
    <footer>TRADING BRAIN / ALL IN ONE <span>NOT FINANCIAL ADVICE</span></footer></main>;
}
