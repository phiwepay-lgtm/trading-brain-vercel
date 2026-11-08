import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, FileCode2, FileText, LockKeyhole } from 'lucide-react';

export default function DownloadCenter() {
  return <section className="feature-card ea-download-card">
    <div className="feature-section-label">01 / CURRENT DOWNLOADS</div>
    <div className="feature-card-heading"><div><h2>Research toolkit<span>.</span></h2><p>Current source drafts and instructions, in one place. Review and compile them on your own platform before testing.</p></div><span className="feature-pill">v15.3 DRAFTS</span></div>
    <div className="ea-file"><span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>MT5 v15.3 Tester Kit</strong><p>Uncompiled tester-only EA, six disabled input presets and setup guide · no live or demo-account orders</p></div><a className="feature-primary" href="/ea/TradingBrain-MT5-v153-Tester.zip" download>Download MT5 Tester Kit (.zip) <ArrowDownToLine size={15}/></a></div>
    <div className="ea-file"><span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>TradingBrain_Tester_v153.mq5</strong><p>Standalone tester-only EA source · compile in MetaEditor · both order gates off by default</p></div><a className="feature-secondary" href="/ea/TradingBrain_Tester_v153.mq5" download>Download Tester EA (.mq5) <ArrowDownToLine size={15}/></a></div>
    <div className="ea-file"><span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>TradingBrain_M5_M1_v15.pine</strong><p>TradingView v15.3 strategy draft · simulation off by default · uncompiled and not equivalent to the MT5 draft</p></div><a className="feature-secondary" href="/ea/TradingBrain_M5_M1_v15.pine" download>Download Pine Draft (.pine) <ArrowDownToLine size={15}/></a></div>
    <div className="ea-file"><span className="ea-file-icon"><FileText size={20}/></span><div><strong>README.txt</strong><p>Current setup, testing and safety notes</p></div><a className="feature-secondary" href="/ea/README.txt" download>Download Instructions <ArrowDownToLine size={15}/></a></div>
    <div className="ea-current-chart"><div><strong>Explore the chart workspace</strong><p>Review M5/M1 candidates and an optional candle simulation in your browser. Feed and fill assumptions apply.</p></div><Link href="/chart">Open chart <ArrowRight size={15}/></Link></div>
    <div className="ea-card-bottom"><span><LockKeyhole size={13}/> SOURCE FILES ONLY</span><span>NO EX5 OR LIVE BRIDGE</span></div>
  </section>;
}
