import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import '../../features.css';
import TesterCsvViewer from './tester-csv-viewer';

export default function ResultsPage() {
  return <div className="feature-page"><header className="feature-topbar"><Link href="/ea" className="feature-back"><ArrowLeft size={15} /> BACK TO EA CENTER</Link><span>TRADING BRAIN <i>/</i> TESTER CSV</span><Link href="/dashboard">DASHBOARD</Link></header>
    <main className="feature-content"><div className="feature-heading"><div><div className="feature-eyebrow"><span /> LOCAL REVIEW / MT5 TESTER</div><h1>Review tester <em>deals.</em></h1><p>Open an Algo V2 tester CSV in this browser.</p></div></div><TesterCsvViewer /><footer className="feature-footer"><span>✳ &nbsp; TRADING BRAIN / YOUR SYSTEM. YOUR EDGE.</span><span>SIMULATED DATA ONLY</span></footer></main></div>;
}
