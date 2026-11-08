'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowDownToLine, ArrowRight, Copy, FileCode2, LockKeyhole } from 'lucide-react';

type PineTool = { name: string; file: string; detail: string; declaration: 'indicator' | 'strategy' };
const tradingViewTools: PineTool[] = [
  { name: 'TradingView Indicator', file: 'TradingBrain_Pro_V1_Indicator.pine', declaration: 'indicator', detail: 'Visual BT/FTB signals and independent virtual positions · simulation on by default; no orders' },
  { name: 'TradingView Strategy', file: 'TradingBrain_Pro_V1_Strategy.pine', declaration: 'strategy', detail: 'Native Strategy Tester plus separate virtual counts · native orders net opposite positions · simulation off by default' },
];
const mt5Tools = [
  { name: 'MT5 Indicator', file: 'TradingBrain_Pro_V1_Indicator.mq5', detail: 'Loaded M1 history and independent virtual positions · no broker orders · compile in MetaEditor' },
  { name: 'MT5 Tester Algo', file: 'TradingBrain_Pro_V1_Tester.mq5', detail: 'Strategy Tester only · hedging account mode required · both simulated-order gates off by default' },
];

function PineSource({ tool }: { tool: PineTool }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function showCode() {
    setLoading(true);
    setCode('');
    setMessage('');
    try {
      const response = await fetch(`/ea/${tool.file}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('The source could not be loaded. Please try the download instead.');
      const text = await response.text();
      const declaration = new RegExp(`^\\ufeff?\\/\\/@version=(?:5|6)\\r?\\n\\s*${tool.declaration}\\s*\\(`);
      if (!declaration.test(text)) throw new Error('The source did not match the expected TradingView file. Nothing was copied.');
      setCode(text);
      setMessage('Code loaded. Copy it, then replace everything in Pine Editor before pasting.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The source could not be loaded. Please try the download instead.');
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setMessage('Copied. In Pine Editor press Ctrl+A, paste, then save and add to chart.');
    } catch {
      setMessage('Clipboard access was blocked. Select all the code below and copy it manually.');
    }
  }

  return <div className="ea-source-tools">
    <button type="button" className="ea-code-toggle" onClick={() => void showCode()} disabled={loading}>{loading ? 'Loading code…' : `Show ${tool.name} code`}</button>
    {code && <div className="ea-code-panel">
      <p>TradingView Pine Editor only · select all existing editor text before pasting.</p>
      <textarea aria-label={`${tool.name} Pine code`} value={code} readOnly spellCheck={false} onFocus={event => event.currentTarget.select()} />
      <button type="button" className="feature-secondary" onClick={() => void copyCode()}><Copy size={14} /> Copy {tool.name} code</button>
    </div>}
    <p className="ea-code-status" role="status">{message}</p>
  </div>;
}

export default function DownloadCenter() {
  return <section className="feature-card ea-download-card">
    <div className="feature-section-label">01 / PRO V1 DOWNLOADS</div>
    <div className="feature-card-heading"><div><h2>TradingBrain Pro V1<span>.</span></h2><p>Four research source drafts. Compile locally and compare each against your own historical charts before relying on signals.</p></div><span className="feature-pill">PRO V1 · DRAFT</span></div>
    <div className="ea-test-status"><strong>RESEARCH DRAFTS · PLATFORM VALIDATION REQUIRED</strong><p>The sources have not been compiled or tested in TradingView or MT5. Platform parity, historical signals and profitability are unverified. Open positions no longer block later signals, but a new M5 event can still replace a pending setup. The MT5 algo cannot place live or demo-account orders.</p></div>
    <div className="ea-platform-guide"><strong>Choose the right editor</strong><p><b>TradingView:</b> use only the <b>.pine</b> files below in Pine Editor. <b>MT5:</b> use only the <b>.mq5</b> files in MetaEditor. Pasting MQL5 into Pine Editor causes a syntax error.</p></div>
    <div className="ea-platform-heading"><h3>TradingView</h3><span>PINE EDITOR · .PINE</span></div>
    <p className="ea-platform-help">Open a Pine file, copy the full source, then in Pine Editor press Ctrl+A to replace all existing text before pasting. Do not paste the MT5 files here.</p>
    {tradingViewTools.map(tool => <div className="ea-file ea-platform-file" key={tool.file}>
      <span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>{tool.name}</strong><p>{tool.detail}</p><code>{tool.file}</code><PineSource tool={tool} /></div>
      <a className="feature-secondary" href={`/ea/${tool.file}`} download>Download {tool.name} <ArrowDownToLine size={15}/></a>
    </div>)}
    <div className="ea-platform-heading ea-platform-heading-mt5"><h3>MetaTrader 5</h3><span>METAEDITOR · .MQ5</span></div>
    <p className="ea-platform-help">Copy these files into the appropriate MT5 data folders and compile in MetaEditor. They are not TradingView Pine scripts.</p>
    {mt5Tools.map(tool => <div className="ea-file ea-platform-file" key={tool.file}>
      <span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>{tool.name}</strong><p>{tool.detail}</p><code>{tool.file}</code></div>
      <a className="feature-secondary" href={`/ea/${tool.file}`} download>Download {tool.name} <ArrowDownToLine size={15}/></a>
    </div>)}
    <div className="ea-current-chart"><div><strong>Research with your history</strong><p>The browser tester is a separate implementation, not a Pro V1 platform backtest.</p></div><div><Link href="/chart">Open chart <ArrowRight size={15}/></Link> <Link href="/tester">Open tester <ArrowRight size={15}/></Link></div></div>
    <div className="ea-card-bottom"><span><LockKeyhole size={13}/> SOURCE FILES ONLY</span><span>NO EX5 OR LIVE BRIDGE</span></div>
  </section>;
}
