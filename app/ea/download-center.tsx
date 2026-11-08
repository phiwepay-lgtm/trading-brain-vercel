'use client';
import { useEffect, useState } from 'react';
import { ArrowDownToLine, FileCode2, FileText, LockKeyhole } from 'lucide-react';
import { useJournal } from '../components/journal-store';
import { createFullPackage } from '../../lib/full-package.mjs';

const pineName = 'TradingBrain_GOLD_M1_VLB_VHB.pine';
export default function DownloadCenter() {
  const {journal}=useJournal();
  const [ready,setReady]=useState(false), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  useEffect(()=>setReady(true),[]);
  async function downloadPackage() {
    setBusy(true);setMessage('Preparing package…');
    try {
      const url=URL.createObjectURL(await createFullPackage(journal?.trades ?? null));const link=document.createElement('a');link.href=url;link.download='TradingBrain_Full_Package.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Package downloaded.');
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Package download failed. Please try again.');}
    finally {setBusy(false);}
  }
  return <section className="feature-card ea-download-card"><div className="feature-section-label">01 / DOWNLOAD CENTER</div><div className="feature-card-heading"><div><h2>Get the source<span>.</span></h2><p>Download the visual scanner and separate simulated strategies. The newer structure draft needs manual review.</p></div><span className="feature-pill">VERSION 1.10</span></div>
    <div className="ea-file"><span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>TradingBrain.mq5</strong><p>Expert Advisor source file · compile in MetaEditor</p></div><a className="feature-primary" href="/ea/TradingBrain.mq5" download>Download EA (.mq5) <ArrowDownToLine size={15}/></a></div>
    <div className="ea-file"><span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>{pineName}</strong><p>Pine v5 M5/M1 visual scanner · candidate heuristic, disabled by default</p></div><a className="feature-secondary" href={`/ea/${pineName}`} download>Download Pine Script (.pine) <ArrowDownToLine size={15}/></a></div>
    <div className="ea-file"><span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>TradingBrain_Strategy.pine</strong><p>Legacy PR12 proxy strategy · <span className="strategy-badge">TESTER + 500 Trades + Quarterly</span></p></div><a className="feature-secondary" href="/ea/TradingBrain_Strategy.pine" download>Download Strategy (.pine) <ArrowDownToLine size={15}/></a></div>
    <div className="ea-file"><span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>TradingBrain_M5_M1_v14.pine</strong><p>Experimental structure draft · uncompiled · sessions and pivots need confirmation</p></div><a className="feature-secondary" href="/ea/TradingBrain_M5_M1_v14.pine" download>Download v14 Draft (.pine) <ArrowDownToLine size={15}/></a></div>
    <div className="ea-file"><span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>TradingBrain_M5_M1_v15.pine</strong><p>Experimental BT + FTB draft · uncompiled · manual review required</p></div><a className="feature-secondary" href="/ea/TradingBrain_M5_M1_v15.pine" download>Download v15 Draft (.pine) <ArrowDownToLine size={15}/></a></div>
    <div className="ea-file"><span className="ea-file-icon"><FileText size={20}/></span><div><strong>README.txt</strong><p>MT5 and TradingView installation and safety notes</p></div><a className="feature-secondary" href="/ea/README.txt" download>Download Instructions <ArrowDownToLine size={15}/></a></div>
    <div className="ea-package"><button className="feature-primary ea-package-button" disabled={!ready || busy} onClick={()=>void downloadPackage()}>{busy ? 'Preparing package…' : 'Download Full Package (ZIP)'} <ArrowDownToLine size={15}/></button><p>{!ready ? 'Checking browser journal…' : journal ? `${journal.trades.length} uploaded journal records available for aggregate-only system.json.` : 'No journal uploaded in this browser; system.json will report unavailable statistics.'} <a href="/dashboard#journal">Manage journal</a></p><p>ZIP includes aggregate data only, no raw trades, notes, or screenshots. Scanners and strategy are disabled by default. The ZIP contains the legacy PR12 proxy, not the separate v14 or v15 drafts. Neither proves the system; no MT5 bridge is included.</p><p className="ea-package-status" aria-live="polite">{message}</p></div>
    <div className="ea-card-bottom"><span><LockKeyhole size={13}/> SOURCE FILE ONLY</span><span>NO EX5 INCLUDED</span></div>
  </section>;
}
