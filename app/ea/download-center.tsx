import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, FileCode2, LockKeyhole } from 'lucide-react';

const tools = [
  { name: 'TradingView Indicator', file: 'TradingBrain_Pro_V1_Indicator.pine', detail: 'Visual BT/FTB signals and independent virtual positions · simulation on by default; no orders' },
  { name: 'TradingView Strategy', file: 'TradingBrain_Pro_V1_Strategy.pine', detail: 'Native Strategy Tester plus separate virtual counts · native orders net opposite positions · simulation off by default' },
  { name: 'MT5 Indicator', file: 'TradingBrain_Pro_V1_Indicator.mq5', detail: 'Loaded M1 history and independent virtual positions · no broker orders · compile in MetaEditor' },
  { name: 'MT5 Tester Algo', file: 'TradingBrain_Pro_V1_Tester.mq5', detail: 'Strategy Tester only · hedging account mode required · both simulated-order gates off by default' },
];

export default function DownloadCenter() {
  return <section className="feature-card ea-download-card">
    <div className="feature-section-label">01 / PRO V1 DOWNLOADS</div>
    <div className="feature-card-heading"><div><h2>TradingBrain Pro V1<span>.</span></h2><p>Four research source drafts. Compile locally and compare each against your own historical charts before relying on signals.</p></div><span className="feature-pill">PRO V1 · DRAFT</span></div>
    <div className="ea-test-status"><strong>RESEARCH DRAFTS · PLATFORM VALIDATION REQUIRED</strong><p>The sources have not been compiled or tested in TradingView or MT5. Platform parity, historical signals and profitability are unverified. Open positions no longer block later signals, but a new M5 event can still replace a pending setup. The MT5 algo cannot place live or demo-account orders.</p></div>
    {tools.map(tool => <div className="ea-file" key={tool.file}><span className="ea-file-icon"><FileCode2 size={21}/></span><div><strong>{tool.name}</strong><p>{tool.detail}</p></div><a className="feature-secondary" href={`/ea/${tool.file}`} download>Download {tool.name} <ArrowDownToLine size={15}/></a></div>)}
    <div className="ea-current-chart"><div><strong>Research with your history</strong><p>The browser tester is a separate implementation, not a Pro V1 platform backtest.</p></div><div><Link href="/chart">Open chart <ArrowRight size={15}/></Link> <Link href="/tester">Open tester <ArrowRight size={15}/></Link></div></div>
    <div className="ea-card-bottom"><span><LockKeyhole size={13}/> SOURCE FILES ONLY</span><span>NO EX5 OR LIVE BRIDGE</span></div>
  </section>;
}
