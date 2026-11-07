import { Activity, ArrowDownRight, ArrowRight, BarChart3, BookOpen, Check, CircleDashed, Crosshair, Database, Fingerprint, Layers3, LockKeyhole, Radio, ScanLine, ShieldCheck, Sparkles, SquareStack, Target, TriangleAlert, Workflow, Zap } from 'lucide-react';
import brain from '../../data/brain.json';
import rawSummary from '../../data/journal_summary.json';

type Summary = {
  status: string;
  total_valid: number | null;
  wins: number | null;
  losses: number | null;
  breakeven: number | null;
  win_rate: number | null;
  note: string;
};
const summary = rawSummary as Summary;
const hasStats = summary.status === 'available' && typeof summary.total_valid === 'number';
const metric = (value: number | null, suffix = '') => hasStats && typeof value === 'number' ? `${value}${suffix}` : '—';

function Logo() {
  return <div className="logo-mark"><span className="logo-grid"><i /><i /><i /><i /></span></div>;
}

export default function Home() {
  return <div className="shell min-h-screen">
    <aside className="sidebar hidden lg:flex">
      <a href="/dashboard" className="brand" aria-label="Trading Brain overview"><Logo /><span><strong>TRADING BRAIN</strong><small>PERSONAL TRADING OS</small></span></a>
      <div className="sidebar-label">WORKSPACE <span>01</span></div>
      <nav aria-label="Main navigation" className="nav-list">
        <a href="/dashboard" className="nav-link"><SquareStack size={16} /><span>Dashboard</span></a>
        <a href="#playbook" className="nav-link active"><BookOpen size={16} /><span>My playbook</span></a>
        <a href="#statistics" className="nav-link"><BarChart3 size={16} /><span>Journal insights</span></a>
        <a href="#connection" className="nav-link"><Workflow size={16} /><span>Connections</span></a>
      </nav>
      <div className="sidebar-bottom">
        <div className="side-card"><div className="side-card-icon"><ShieldCheck size={17} /></div><div><strong>Built for your process</strong><p>One system. Clear decisions.</p></div></div>
        <div className="sidebar-footer"><span className="footer-dot" /> PRIVATE WORKSPACE <span>V 1.0</span></div>
      </div>
    </aside>
    <main id="overview" className="main-area min-w-0 flex-1">
      <header className="topbar flex items-center justify-between">
        <div className="top-left flex items-center gap-3"><a href="/dashboard" className="mobile-logo lg:hidden" aria-label="Back to dashboard"><Logo /></a><span className="crumb-dim">WORKSPACE</span><span className="crumb-slash">/</span><span className="crumb-current">PLAYBOOK</span></div>
        <div className="top-right flex items-center gap-3"><span className="top-caption hidden sm:inline">YOUR TRADING WORKSPACE</span><span className="top-divider hidden sm:block" /><span className="offline-pill"><span /> OFFLINE</span></div>
      </header>
      <div className="page-content">
        <div className="page-heading flex flex-wrap items-end justify-between gap-5">
          <div><div className="eyebrow"><span className="eyebrow-line" /> THE TRADING BRAIN</div><h1>Your edge, <em>in focus.</em></h1><p>Your trading system, distilled into one clear workspace.</p></div>
          <div className="heading-tag"><span className="tag-icon"><Fingerprint size={17} /></span><span><b>YOUR SYSTEM</b><small>Built around your process</small></span></div>
        </div>

        <section id="connection" aria-label="Connection status" className="connection-banner flex flex-wrap items-center gap-4">
          <div className="connection-icon"><Radio size={18} /></div><div className="connection-text"><strong>Observation mode</strong><p>Your brain is ready. Live connectivity is not active.</p></div><div className="connection-pills"><span><i /> MT5 Connected: <b>No</b></span><span><i /> Scanning: <b>No</b></span></div>
        </section>

        <div className="content-grid">
          <div className="primary-column">
            <section id="playbook" className="section-block">
              <div className="section-heading"><div><div className="section-kicker">THE PLAYBOOK <span>01</span></div><h2>Your system<span className="accent-dot">.</span></h2><p>From structure to execution. One step at a time.</p></div><div className="heading-action">SYSTEM OVERVIEW <ArrowDownRight size={14} /></div></div>
              <div className="playbook-card">
                <div className="playbook-head"><div><div className="card-overline"><span className="lime-dot" /> THE SETUP <span className="line-separator" /> MULTI-TIMEFRAME</div><h3>M5 structure.<br /><em>M1 precision.</em></h3><p>{brain.system_name}</p></div><div className="playbook-art" aria-hidden="true"><span className="art-ring ring-one" /><span className="art-ring ring-two" /><Crosshair size={43} strokeWidth={1} /></div></div>
                <div className="flow-line"><span>THE SEQUENCE</span><div /><span>3 STEPS</span></div>
                <div className="rules-grid">
                  <div className="rule"><div className="rule-top"><span>01</span><span className="tf-tag">M5</span></div><div className="rule-icon"><Layers3 size={18} /></div><h4>Structure</h4><p>{brain.htf}</p><div className="rule-bottom">HIGHER TIMEFRAME</div></div>
                  <div className="rule"><div className="rule-top"><span>02</span><span className="tf-tag">0.382</span></div><div className="rule-icon"><Target size={18} /></div><h4>Entry zone</h4><p>{brain.entry_zone}</p><div className="rule-bottom">THE RETRACEMENT</div></div>
                  <div className="rule"><div className="rule-top"><span>03</span><span className="tf-tag">M1</span></div><div className="rule-icon"><Zap size={18} /></div><h4>Confirmation</h4><p>{brain.ltf_confirm.join(' + ')}</p><div className="rule-bottom">LOWER TIMEFRAME</div></div>
                </div>
                <div className="risk-strip"><span className="risk-icon"><ShieldCheck size={16} /></span><div><small>RISK FRAMEWORK</small><strong>{brain.risk}</strong></div><span className="risk-label">DEFINED RISK <Check size={12} /></span></div>
              </div>
            </section>
            <section id="statistics" className="section-block statistics-section">
              <div className="section-heading"><div><div className="section-kicker">THE JOURNAL <span>02</span></div><h2>Performance<span className="accent-dot">.</span></h2><p>Verified numbers only. No assumptions, no noise.</p></div><div className="heading-action">JOURNAL INSIGHTS <ArrowDownRight size={14} /></div></div>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-top"><span>WIN RATE</span><Activity size={15} /></div><strong>{metric(summary.win_rate, '%')}</strong><div className="stat-bottom"><span className="mini-dash" /> {hasStats ? 'VERIFIED JOURNAL' : 'AWAITING DATA'}</div></div>
                <div className="stat-card"><div className="stat-top"><span>VALID TRADES</span><BarChart3 size={15} /></div><strong>{metric(summary.total_valid)}</strong><div className="stat-bottom"><span className="mini-dash" /> {hasStats ? 'VERIFIED JOURNAL' : 'AWAITING DATA'}</div></div>
                <div className="stat-card"><div className="stat-top"><span>WINS / LOSSES</span><Target size={15} /></div><strong>{hasStats ? `${metric(summary.wins)} / ${metric(summary.losses)}` : '—'}</strong><div className="stat-bottom"><span className="mini-dash" /> {hasStats ? 'VERIFIED JOURNAL' : 'AWAITING DATA'}</div></div>
              </div>
              {!hasStats && <div className="notice"><TriangleAlert size={16} /><div><strong>STATISTICS UNAVAILABLE</strong><p>Awaiting verified 33 export. No performance data has been assumed.</p></div><span className="notice-tag">PENDING</span></div>}
            </section>
          </div>
          <aside className="right-column">
            <div className="section-heading side-heading"><div><div className="section-kicker">AT A GLANCE <span>03</span></div><h2>Brain status<span className="accent-dot">.</span></h2><p>A quick look under the hood.</p></div></div>
            <section className="status-card" aria-label="Brain status"><div className="status-card-top"><div className="status-card-icon"><Activity size={18} /></div><span className="status-muted-pill"><span /> OFFLINE</span></div><h3>System standing by</h3><p>The playbook is here. Nothing is being scanned or traded.</p><div className="status-rows"><div><span><Radio size={14} /> MT5 Connected</span><b><i /> No</b></div><div><span><ScanLine size={14} /> Scanning</span><b><i /> No</b></div><div><span><Database size={14} /> Journal repo</span><b className="local-status">Local-only</b></div><div><span><LockKeyhole size={14} /> Journal data</span><b className="local-status">Encrypted</b></div></div><div className="status-foot"><span><CircleDashed size={13} /> NO LIVE CONNECTION</span><span>•</span></div></section>
            <section className="principle-card"><div className="principle-icon"><Sparkles size={18} /></div><div className="principle-kicker">THE PRINCIPLE</div><h3>Process over<br /><em>prediction.</em></h3><p>A clear system makes it easier to wait for the right conditions.</p><div className="principle-foot">STAY PATIENT. STAY CONSISTENT. <ArrowRight size={13} /></div></section>
            <div className="data-privacy"><LockKeyhole size={14} /><p><strong>Journal Repo Status: Local-only, Encrypted</strong><br />No raw journal data is stored in this brain.</p></div>
          </aside>
        </div>
        <footer className="page-footer"><span><span className="footer-accent">✳</span> TRADING BRAIN <i>/</i> YOUR SYSTEM. YOUR EDGE.</span><span>BUILT FOR CLARITY <i>•</i> NOT FINANCIAL ADVICE</span></footer>
      </div>
    </main>
  </div>;
}
