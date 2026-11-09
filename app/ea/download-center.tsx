'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, Copy, FileCode2 } from 'lucide-react';

const sourcePath = '/ea/Dark_Orders_Pure_Price.pine';

function ResearchPinePreview({ path, label, declaration, titlePrefix = 'TradingView Algo V2 Study', version = 6 }: { path: string; label: string; declaration: 'indicator' | 'strategy'; titlePrefix?: string; version?: 5 | 6 }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  async function show() {
    setLoading(true); setCode(''); setMessage('');
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load the code. Please download the file instead.');
      const text = await response.text();
      if (!text.startsWith(`//@version=${version}\n${declaration}("${titlePrefix}`)) throw new Error('Unexpected source file; nothing was copied.');
      setCode(text); setMessage('Code loaded. Replace the contents of Pine Editor before pasting.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load the source.'); }
    finally { setLoading(false); }
  }
  async function copy() {
    try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(code); setMessage('Copied. Paste into Pine Editor, save and add to chart.'); }
    catch { setMessage('Clipboard access was blocked. Select and copy the code below manually.'); }
  }
  return <div className="ea-source-tools"><button type="button" className="ea-code-toggle" disabled={loading} onClick={() => void show()}>{loading ? 'Loading code…' : `Show ${label} code`}</button>
    {code && <div className="ea-code-panel"><p>Replace all existing text in TradingView Pine Editor with this script.</p><textarea aria-label={`${label} Pine code`} value={code} readOnly spellCheck={false} onFocus={event => event.currentTarget.select()} /><button type="button" className="feature-secondary" onClick={() => void copy()}><Copy size={14} /> Copy {label} code</button></div>}
    <p className="ea-code-status" role="status">{message}</p></div>;
}

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
      setMessage('Code loaded. Replace the existing text in TradingView Pine Editor before pasting.');
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
      setMessage('Copied. Replace the existing text in Pine Editor, paste, save and add to chart.');
    } catch {
      setMessage('Clipboard access was blocked. Select and copy the code below manually.');
    }
  }

  return <><section className="feature-card ea-download-card">
    <div className="feature-section-label">01 / TRADINGVIEW INDICATOR</div>
    <div className="feature-card-heading"><div>
      <h2>Dark Orders <span>—</span> Pure Price + History<span>.</span></h2>
      <p>A price-only TradingView overlay highlighting unusual candle expansion, with a recent-signal recap.</p>
    </div><span className="feature-pill">PINE SCRIPT · V5</span></div>
    <div className="ea-platform-guide"><strong>How to read it</strong><p>Orange means both range and body meet their multiplier and 1.5 Z-score thresholds, but there is no directional DARK signal. Teal (DARK+ PURE) or red (DARK− PURE) also requires the Heikin Ashi body to exceed 1.2 times its 20-bar average and the chart candle to close bullish or bearish, respectively. The labels remain lime for bullish and red for bearish signals, appearing below and above bars respectively; other candles keep their chart colors.</p></div>
    <div className="ea-platform-guide"><strong>History recap</strong><p>The optional table shows the latest 20 confirmed DARK+ and DARK− signals by default (adjustable to 1–100), newest first. Times are bar-open times in the symbol’s exchange timezone; prices are bar closes. The bottom counts cover all loaded chart history, not just the displayed rows or a particular day or week. Orange bars are painted on the chart but are not listed or counted.</p></div>
    <div className="ea-file ea-platform-file">
      <span className="ea-file-icon"><FileCode2 size={21} /></span>
      <div><strong>Dark Orders Pure Price + History [Blackwatch]</strong><p>TradingView overlay · 50-bar lookback · 1.8 range and body multipliers · 1.5 Z-score · recent confirmed-signal recap · bullish and bearish alert conditions</p><code>Dark_Orders_Pure_Price.pine</code>
        <div className="ea-source-tools">
          <button type="button" className="ea-code-toggle" onClick={() => void showCode()} disabled={loading}>{loading ? 'Loading code…' : 'Show Dark Orders code'}</button>
          {code && <div className="ea-code-panel"><p>In TradingView, open Pine Editor, replace its contents with this script, then save and add to chart. For the M5 approach, use a 5-minute chart.</p><textarea aria-label="Dark Orders Pine code" value={code} readOnly spellCheck={false} onFocus={event => event.currentTarget.select()} /><button type="button" className="feature-secondary" onClick={() => void copyCode()}><Copy size={14} /> Copy Dark Orders code</button></div>}
          <p className="ea-code-status" role="status">{message}</p>
        </div>
      </div>
      <a className="feature-secondary" href={sourcePath} download>Download Dark Orders <ArrowDownToLine size={15} /></a>
    </div>
    <div className="feature-notice warning"><p><strong>Context, not a trading signal.</strong> Price expansion alone does not identify institutional or dark-pool orders, net buying or selling, or guarantee an entry. The script does not detect the 0.382 level. Heikin Ashi uses the chart timeframe; open-bar colors and conditions can change before close, so use once-per-bar-close alerts for confirmed bars. GC and XAUUSD can differ by feed, session and price history; any lead or timing relationship is unverified. Historical colors and counts depend on loaded data and settings and are recalculated, not permanently saved. The table does not measure trade outcomes or establish why a trade failed. This script has not been compiled or verified in TradingView.</p></div>
  </section>
  <section className="feature-card ea-download-card">
    <div className="feature-section-label">02 / TRADINGVIEW RESEARCH DRAFT</div>
    <div className="feature-card-heading"><div><h2>TradingView Algo V1 <span>—</span> Study V2<span>.</span></h2><p>An initial, unverified price-action research indicator—not a finished automation system.</p></div><span className="feature-pill">PINE SCRIPT · V6</span></div>
    <div className="ea-platform-guide"><strong>What this draft does</strong><p>On a standard M1 chart, it uses completed M5 Heikin Ashi bars to find provisional 0.382, continuation and FTB setups, then marks M1 CHoCH, engulf and virtual positions. On a standard M5 chart it shows a multi-symbol scanner and completed M5 0.382 touches; M1 signals and the performance recap do not run in the background on M5. Enable up to nine additional symbols in settings and create an alert for “Any alert() function call”. Alerts arrive after M5 confirmation, not at the live touch.</p></div>
    <div className="ea-platform-guide"><strong>Important limitations</strong><p>Pivot clarity, FTB attempts, stops and expiry use explicit approximations; they are not yet validated against your charts. M1 pivot dots are drawn back at the pivot but are only known after confirmation. M5 dots mark confirmation, not the original pivot time. The day and Monday-start week recap uses the symbol exchange timezone and is hypothetical, limited to the latest selected candidates. It uses stop-first on ambiguous bars, arms breakeven after a bar closes, and censors gaps. The default structure-exit proxy closes on a break of a confirmed post-entry higher low or lower high; it is configurable and not yet chart-validated. See the <a href="/ea/TradingView_Indicator_Algo_V1_Research_Notes.txt" target="_blank" rel="noreferrer" style={{ color: "#c5ed90", textDecoration: "underline" }}>research notes</a> before interpreting signals.</p><p>The separate Strategy Tester and MT5 drafts use simulated orders and can diverge from the virtual display. The MT5 EA is tester-only, with orders disabled by default. No live or demo orders are placed.</p></div>
    <div className="ea-file ea-platform-file"><span className="ea-file-icon"><FileCode2 size={21} /></span><div><strong>TradingView Algo V2 — study indicator draft</strong><p>Historical entry/stop and 2/3/4/5/7R levels · uncompiled</p><code>TradingView_Algo_V2_Study_Indicator.pine</code><ResearchPinePreview path="/ea/TradingView_Algo_V2_Study_Indicator.pine" label="Algo V2 indicator" declaration="indicator" /></div><a className="feature-secondary" href="/ea/TradingView_Algo_V2_Study_Indicator.pine" download>Download Algo V2 indicator draft <ArrowDownToLine size={15} /></a></div>
    <div className="ea-file ea-platform-file"><span className="ea-file-icon"><FileCode2 size={21} /></span><div><strong>TradingView Algo V2 — Strategy Tester draft</strong><p>Native simulated orders plus hypothetical 2/3/5R recap · standard M1 · uncompiled</p><code>TradingView_Algo_V2_Study_Strategy.pine</code><ResearchPinePreview path="/ea/TradingView_Algo_V2_Study_Strategy.pine" label="Algo V2 strategy" declaration="strategy" /></div><a className="feature-secondary" href="/ea/TradingView_Algo_V2_Study_Strategy.pine" download>Download Algo V2 strategy draft <ArrowDownToLine size={15} /></a></div>
    <div className="ea-file ea-platform-file"><span className="ea-file-icon"><FileCode2 size={21} /></span><div><strong>MT5 indicator and V2 tester EA — research package</strong><p>Source files only · standard M1 · tester EA orders off by default · not compiled in MetaEditor</p><code>Algo_V1_MT5_Research.zip</code></div><a className="feature-secondary" href="/ea/Algo_V1_MT5_Research.zip" download>Download MT5 research package <ArrowDownToLine size={15} /></a></div>
    <div className="ea-platform-guide"><strong>Individual MT5 sources</strong><p><a href="/ea/AlgoV2TesterResearch.mq5" download style={{ color: "#c5ed90", textDecoration: "underline" }}>Download the V2 tester EA (.mq5)</a>, the <a href="/ea/AlgoV1Research.mq5" download style={{ color: "#c5ed90", textDecoration: "underline" }}>MT5 indicator (.mq5)</a>, and the required <a href="/ea/AlgoV1Core.mqh" download style={{ color: "#c5ed90", textDecoration: "underline" }}>shared core (.mqh)</a>. The ZIP also contains both files and the indicator.</p></div>
    <div className="ea-file ea-platform-file"><span className="ea-file-icon"><FileCode2 size={21} /></span><div><strong>Algo V3 — corrected visual study draft</strong><p>Uses the V2 research sequence with orange M5 anchors, yellow CHoCH and blue/red study boxes. Not validated against your chart.</p><code>TradingView_Algo_V3_Study_Indicator.pine</code><ResearchPinePreview path="/ea/TradingView_Algo_V3_Study_Indicator.pine" label="Algo V3 study" declaration="indicator" titlePrefix="TradingView Algo V3 Study" /></div><a className="feature-secondary" href="/ea/TradingView_Algo_V3_Study_Indicator.pine" download>Download Algo V3 study <ArrowDownToLine size={15} /></a></div>
    <div className="ea-file ea-platform-file"><span className="ea-file-icon"><FileCode2 size={21} /></span><div><strong>M5 HA Brain V3 — supplied reference only</strong><p>Uncompiled and not chart-verified. The default pivot/entry timing cannot produce entries; it also does not enforce the requested 0.382/FTB sequence. Do not use for trading. See the research notes.</p><code>M5_HA_Brain_V3_User_Reference.pine</code><ResearchPinePreview path="/ea/M5_HA_Brain_V3_User_Reference.pine" label="V3 reference" declaration="indicator" titlePrefix="M5 HA Brain V3" version={5} /></div><a className="feature-secondary" href="/ea/M5_HA_Brain_V3_User_Reference.pine" download>Download V3 reference <ArrowDownToLine size={15} /></a></div>
    <div className="ea-platform-guide"><strong>Review MT5 tester CSV</strong><p>Optionally enable SaveTesterDealsCSV in the tester EA, then open the agent-sandbox CSV in the <Link href="/ea/results" style={{ color: "#c5ed90", textDecoration: "underline" }}>local tester-deal viewer</Link>. The file is read in your browser; it is not uploaded or added to the journal.</p></div>
    <div className="feature-notice warning"><p><strong>Research only.</strong> Historical candidates, virtual levels and scanner alerts are not verified trade results. The Pine and MT5 sources have not been compiled or tested on their target platforms. Review the source and validate it bar by bar before using it.</p></div>
  </section></>;
}
