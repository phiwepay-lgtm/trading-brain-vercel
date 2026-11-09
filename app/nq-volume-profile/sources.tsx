'use client';

import Link from 'next/link';
import { useState } from 'react';

const files = {
  pine: { title: 'TradingView Pine', path: '/ea/NQ_Developing_Volume_Profile.pine', first: '//@version=6', filename: 'NQ_Developing_Volume_Profile.pine' },
  indie: { title: 'Indie draft', path: '/ea/NQ_Developing_Volume_Profile.indie.txt', first: '# indie:lang_version = 5', filename: 'NQ_Developing_Volume_Profile.indie.txt' },
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

export default function NQVolumeProfile() {
  return <main className="page"><header><Link className="brand" href="/">TRADING BRAIN <span>/</span> DARK ORDERS</Link><span className="tag">NQ PROFILE</span></header>
    <section className="intro"><p className="eyebrow">NQ FUTURES OPEN / DEVELOPING RANGE</p><h1>NQ Volume Profile<span>.</span></h1><p>A custom chart-bar approximation for TradingView and an Indie draft for the Exness editor.</p></section>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">TRADINGVIEW / INDIE</p><h2>Choose your platform</h2><p>Latest developing profile, starting two hours before the 6:00 p.m. New York CME futures open.</p></div></div>
      <div className="details"><h3>Range and data</h3><p>The range resets at 4:00 p.m. America/New_York each calendar day and develops until the next reset. This is an assumed daily cycle, not the exchange calendar: holidays, early closes, weekends, maintenance breaks and gaps follow the available feed. The first observed bar after the reset begins the display; it can be later than 4:00 p.m. Use standard, aligned intraday candles between 1 minute and 1 hour, with sufficient history. Bars are assigned by open time; straddling bars cannot be split. Missing history or reaching the scan limit makes the profile incomplete.</p></div>
      <div className="details"><h3>Reading the profile</h3><p>Each candle’s reported volume is distributed uniformly across its high–low range. The yellow line is the estimated POC; aqua lines mark value area high and low. Choose Total, Up/Down or Delta, price rows and value area percentage. Up/down is defined by candle close versus open—not actual buyer and seller volume. The developing profile changes as new data arrives; only the latest range is displayed.</p></div>
      <Source kind="pine" /><Source kind="indie" />
      <aside><strong>Important limitations.</strong> These are independent approximations, not TradingView’s built-in Session Volume Profile HD or its fixed-range drawing tool. They do not auto-adjust detail on zoom, use lower-timeframe data, keep historical profiles, apply year-end alignment or extend completed levels until a later crossing. They use chart-bar volume; NQ futures trade volume and an Exness index CFD’s tick volume and prices are different feeds and cannot be expected to match. Heikin Ashi and other synthetic bars distort prices and volume. Neither script has been compiled in its target editor; Indie drawing, scheduling and runtime support in your Exness editor are unverified.</aside>
    </section><footer>TRADING BRAIN / NQ VOLUME PROFILE <span>NOT FINANCIAL ADVICE</span></footer></main>;
}
