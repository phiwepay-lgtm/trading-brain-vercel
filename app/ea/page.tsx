import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileCode2 } from 'lucide-react';
import '../features.css';
import DownloadCenter from './download-center';

export default function EaPage() {
  return <div className="feature-page">
    <header className="feature-topbar">
      <Link href="/dashboard" className="feature-back"><ArrowLeft size={15} /> BACK TO DASHBOARD</Link>
      <span>TRADING BRAIN <i>/</i> EA CENTER</span>
      <Link href="/chart">OPEN CHART <ArrowRight size={13} /></Link>
    </header>
    <main className="feature-content">
      <div className="feature-heading">
        <div><div className="feature-eyebrow"><span /> THE TRADING BRAIN / DOWNLOADS</div><h1>EA <em>Center.</em></h1><p>Your place for EA and script downloads.</p></div>
        <div className="feature-head-badge"><FileCode2 size={17} /><div><strong>EA CENTER</strong><small>Downloads</small></div></div>
      </div>
      <DownloadCenter />
      <footer className="feature-footer"><span>✳ &nbsp; TRADING BRAIN / YOUR SYSTEM. YOUR EDGE.</span><span>NOT FINANCIAL ADVICE</span></footer>
    </main>
  </div>;
}
