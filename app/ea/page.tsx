import Link from 'next/link';
import {ArrowLeft, ArrowRight, ShieldAlert, Workflow} from 'lucide-react';
import '../features.css';
import DownloadCenter from './download-center';

export default function EaPage(){
  return <div className="feature-page"><header className="feature-topbar"><Link href="/dashboard" className="feature-back"><ArrowLeft size={15}/> BACK TO DASHBOARD</Link><span>TRADING BRAIN <i>/</i> RESEARCH TOOLS</span><Link href="/chart">OPEN CHART <ArrowRight size={13}/></Link></header>
    <main className="feature-content"><div className="feature-heading"><div><div className="feature-eyebrow"><span/> THE TRADING BRAIN / TOOLS</div><h1>Research, <em>in one place.</em></h1><p>Manage your strategy downloads.</p></div></div>
      <div className="feature-notice warning"><ShieldAlert size={18}/><p><strong>Research only.</strong> The website signal endpoint remains HOLD; there is no live MT5 bridge.</p></div>
      <div className="ea-layout"><div className="ea-main"><DownloadCenter/></div><aside className="ea-aside"><section className="feature-card ea-status-card"><span className="ea-status-icon"><Workflow size={19}/></span><div className="feature-section-label">CURRENT STATE</div><h2>Research mode<span>.</span></h2><p>The browser chart and tester remain independent research tools.</p><div className="ea-status-row"><span>Signal endpoint</span><strong>HOLD ONLY</strong></div><div className="ea-status-row"><span>MT5 connection</span><strong>DISCONNECTED</strong></div><div className="ea-status-row"><span>Downloads</span><strong>NONE</strong></div></section></aside></div>
      <footer className="feature-footer"><span>✳ &nbsp; TRADING BRAIN / YOUR SYSTEM. YOUR EDGE.</span><span>NOT FINANCIAL ADVICE</span></footer></main></div>;
}
