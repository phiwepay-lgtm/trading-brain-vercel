'use client';

import Link from 'next/link';
import { useState } from 'react';

const files = {
  pine: { title: 'TradingView Pine', path: '/ea/Blackwatch_My_Session_Range.pine', first: '//@version=6', filename: 'Blackwatch_My_Session_Range.pine' },
  indie: { title: 'Indie draft', path: '/ea/Blackwatch_My_Session_Range.indie.txt', first: '# indie:lang_version = 5', filename: 'Blackwatch_My_Session_Range.indie.txt' },
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

export default function SessionRange() {
  return <main className="page"><header><Link className="brand" href="/">TRADING BRAIN <span>/</span> DARK ORDERS</Link><span className="tag">SESSION RANGE</span></header>
    <section className="intro"><p className="eyebrow">YOUR TRADING HOURS / RANGE</p><h1>My Session Range<span>.</span></h1><p>A separate indicator to highlight the latest observed session’s high and low.</p></section>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">TRADINGVIEW / INDIE</p><h2>Choose your platform</h2><p>Based on Blackwatch Advisory’s modification of RobMinty’s FXN - Asian Session Range.</p></div></div>
      <div className="details"><h3>Session times and timezone</h3><p>The default is 03:00–07:00 fixed EST (UTC−5). The original source used a hard-coded broker offset; these drafts use an explicit timezone, so times may differ from the original. For US Eastern time that follows daylight saving, enter America/New_York. The Indie default is Etc/GMT+5, the IANA name for fixed UTC−5.</p></div>
      <div className="details"><h3>How the range is shown</h3><p>Both drafts track the high and low of the latest observed session and include bars by their open time. The range changes while the session is forming. Use an intraday chart with bars aligned to the session boundaries; missing data and timeframes that cross a boundary can affect the range.</p></div>
      <Source kind="pine" /><Source kind="indie" />
      <aside><strong>Verification and differences.</strong> Neither script has been compiled in its target editor. The Indie version is a draft and requires support for Indie schedule and drawing APIs. Its box spans the first through last observed session bar, without projecting to the scheduled end; the Pine box extends to the scheduled end and is limited to intraday timeframes up to one hour. Compare session times and ranges against your own charts before using them.</aside>
    </section><footer>TRADING BRAIN / SESSION RANGE <span>NOT FINANCIAL ADVICE</span></footer></main>;
}
