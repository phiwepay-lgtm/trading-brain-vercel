'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, BarChart3, BookOpen, Braces, Upload, Download, CheckCircle2, ChevronRight, CircleHelp, Clock3, Database, ExternalLink, FileTerminal, Gauge, LayoutDashboard, LoaderCircle, Pause, Play, Radio, RefreshCw, ShieldCheck, TerminalSquare, Trash2, Wallet, WifiOff } from 'lucide-react';

type Status = { mt5_connected: boolean; scanning: boolean; bot_status: string; last_trade_time: string | null; pnl_today: number | null; source: string; checked_at: string };
type Trade = { time: string; pair: string; action: string; price: number; profit: number };
type TradesResponse = { available: boolean; trades: Trade[]; message: string; checked_at: string };
type LogEvent = { id: string; timestamp: string; level: string; message: string };
type LogsResponse = { event: LogEvent; source: string };
type ApiName = 'status' | 'brain';

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function time(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function Monitor() {
  const [status, setStatus] = useState<Status | null>(null);
  const [trades, setTrades] = useState<TradesResponse | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [logSource, setLogSource] = useState('Request diagnostics only; no persistent bot log source is connected.');
  const [pollError, setPollError] = useState('');
  const [paused, setPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [testing, setTesting] = useState<ApiName | null>(null);
  const [apiOutput, setApiOutput] = useState<{ endpoint: string; body: unknown } | null>(null);
  const [feedback, setFeedback] = useState('Dashboard ready. Monitoring requests will appear below.');
  const inFlight = useRef(false);
  const alive = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const inform = useCallback((message: string) => {
    console.log('[Trading Brain]', message);
    setFeedback(message);
  }, []);

  const poll = useCallback(async (manual = false) => {
    if (inFlight.current) {
      if (manual) inform('A refresh is already in progress.');
      return;
    }
    inFlight.current = true;
    if (manual) { setRefreshing(true); inform('Refreshing status, trades and diagnostics…'); }
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 8000);
    try {
      const [statusResult, tradesResult, logsResult] = await Promise.allSettled([
        getJson<Status>('/api/status', abort.signal),
        getJson<TradesResponse>('/api/trades', abort.signal),
        getJson<LogsResponse>('/api/logs', abort.signal),
      ]);
      if (!alive.current) return;
      const failures: string[] = [];
      if (statusResult.status === 'fulfilled') setStatus(statusResult.value);
      else { setStatus(null); failures.push('status'); }
      if (tradesResult.status === 'fulfilled') setTrades(tradesResult.value);
      else { setTrades(null); failures.push('trades'); }
      if (logsResult.status === 'fulfilled') {
        setLogs(previous => [...previous, logsResult.value.event].slice(-50));
        setLogSource(logsResult.value.source);
      } else failures.push('diagnostics');
      setPollError(failures.length ? `Could not reach: ${failures.join(', ')}. Retrying on the next refresh.` : '');
      if (manual) inform(failures.length ? `Refresh incomplete: ${failures.join(', ')} unavailable.` : 'Refresh complete. Latest API responses received.');
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === abort) controller.current = null;
      inFlight.current = false;
      if (alive.current && manual) setRefreshing(false);
    }
  }, [inform]);

  useEffect(() => {
    alive.current = true;
    if (!paused) {
      void poll();
      const interval = window.setInterval(() => void poll(), 3000);
      return () => { alive.current = false; window.clearInterval(interval); controller.current?.abort(); };
    }
    return () => { alive.current = false; controller.current?.abort(); };
  }, [paused, poll]);

  async function testApi(name: ApiName) {
    if (testing) return;
    setTesting(name);
    setApiOutput(null);
    inform(`Testing /api/${name}…`);
    try {
      const result = await getJson<unknown>(`/api/${name}`, AbortSignal.timeout(8000));
      setApiOutput({ endpoint: `/api/${name}`, body: result });
      setLogs(previous => [...previous, { id: crypto.randomUUID(), timestamp: new Date().toISOString(), level: 'INFO', message: `GET /api/${name} completed successfully in this browser.` }].slice(-50));
      inform(`/api/${name} responded successfully. JSON is shown below.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setApiOutput({ endpoint: `/api/${name}`, body: { error: message } });
      setLogs(previous => [...previous, { id: crypto.randomUUID(), timestamp: new Date().toISOString(), level: 'ERROR', message: `GET /api/${name} failed: ${message}` }].slice(-50));
      inform(`/api/${name} failed: ${message}`);
    } finally { setTesting(null); }
  }

  function togglePolling() {
    const next = !paused;
    setPaused(next);
    inform(next ? 'Automatic monitoring paused. Manual refresh is still available.' : 'Automatic monitoring resumed (every 3 seconds).');
  }
  function clearLogs() { setLogs([]); inform('Session diagnostics cleared. New requests will appear as they happen.'); }
  const nav = (label: string) => () => inform(`Opened ${label}.`);
  const statusNote = status ? status.source : 'Status API unavailable or not yet checked.';
  const pnl = status?.pnl_today;

  return <div className="monitor-shell min-h-screen">
    <aside className="monitor-sidebar">
      <a href="/dashboard" className="monitor-brand" onClick={nav('dashboard')}><span className="monitor-mark"><i /><i /><i /><i /></span><span><strong>TRADING BRAIN</strong><small>PERSONAL TRADING OS</small></span></a>
      <div className="monitor-side-label">WORKSPACE <span>01</span></div>
      <nav className="monitor-nav" aria-label="Dashboard navigation">
        <a href="#overview" className="selected" onClick={nav('overview')}><LayoutDashboard size={16} /> Overview <span className="nav-indicator" /></a>
        <a href="#live-trades" onClick={nav('live trades')}><BarChart3 size={16} /> Live trades</a>
        <a href="#activity-logs" onClick={nav('activity logs')}><FileTerminal size={16} /> Activity logs</a>
        <a href="#api-checks" onClick={nav('API checks')}><Braces size={16} /> API checks</a>
        <a href="/chart" onClick={nav('charts')}><BarChart3 size={16} /> Chart workspace</a>
        <a href="/brain" onClick={nav('chart assessment')}><Upload size={16} /> Upload setup</a>
        <a href="/ea" onClick={nav('EA downloads')}><Download size={16} /> EA download center</a>
        <a href="/playbook" onClick={nav('playbook')}><BookOpen size={16} /> My playbook <ExternalLink size={12} className="nav-external" /></a>
      </nav>
      <div className="monitor-sidebar-foot"><div className="sidebar-note"><ShieldCheck size={17} /><div><strong>Built for your process</strong><p>Clarity, without the noise.</p></div></div><div className="sidebar-meta"><span className="dot" /> PRIVATE WORKSPACE <span>V 2.0</span></div></div>
    </aside>
    <main className="monitor-main" id="overview">
      <header className="monitor-topbar"><div className="crumb"><span>WORKSPACE</span><i>/</i><strong>OVERVIEW</strong></div><div className="topbar-right"><span className="topbar-label">SYSTEM STATUS</span><span className="offline-tag"><span /> {status?.mt5_connected ? 'CONNECTED' : status ? 'DISCONNECTED' : 'UNKNOWN'}</span></div></header>
      <div className="monitor-content">
        <div className="monitor-heading"><div><div className="overline"><span className="overline-dash" /> THE TRADING BRAIN <span className="overline-separator">/</span> MONITOR</div><h1>Your edge, <em>in focus.</em></h1><p>A clearer view of your system, all in one place.</p></div><div className="heading-buttons"><a href="/brain" className="upload-setup-button" onClick={nav('chart assessment')}><Upload size={15} /> Upload Setup</a><button type="button" className="refresh-button" onClick={() => void poll(true)} disabled={refreshing} aria-busy={refreshing}><RefreshCw size={15} className={refreshing ? 'spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh data'}</button></div></div>
        <div className="mobile-nav" aria-label="Mobile navigation"><a href="#overview" onClick={nav('overview')}>Overview</a><a href="#live-trades" onClick={nav('live trades')}>Trades</a><a href="#activity-logs" onClick={nav('activity logs')}>Logs</a><a href="#api-checks" onClick={nav('API checks')}>API</a><a href="/chart" onClick={nav('charts')}>Charts</a><a href="/brain" onClick={nav('chart assessment')}>Upload setup</a><a href="/ea" onClick={nav('EA downloads')}>EA downloads</a><a href="/playbook" onClick={nav('playbook')}>Playbook ↗</a></div>
        <section className="connection-notice" aria-label="Connection notice"><div className="connection-notice-icon"><WifiOff size={18} /></div><div><strong>Observation mode</strong><p>{statusNote} Live trading data will appear when a real integration is configured.</p></div><span className="connection-pill"><span /> MT5 {status?.mt5_connected ? 'CONNECTED' : status ? 'DISCONNECTED' : 'UNKNOWN'}</span></section>
        <div className="feedback-line" role="status" aria-live="polite"><CheckCircle2 size={13} /> <span>{feedback}</span></div>
        {pollError && <div className="poll-error" role="alert">{pollError}</div>}
        <section className="metrics-section" aria-labelledby="status-title"><div className="monitor-section-head"><div><div className="section-eyebrow">YOUR SYSTEM <span>01</span></div><h2 id="status-title">Live status<span>.</span></h2><p>Your system at a glance. Click a card for details.</p></div><div className="section-micro"><span className={paused ? 'quiet-dot' : 'green-dot'} /> {paused ? 'POLLING PAUSED' : 'POLLING EVERY 3S'}</div></div>
          <div className="monitor-metrics">
            <button type="button" className="monitor-metric metric-bot" onClick={() => inform(statusNote + ' Bot on/off state is unknown until connected.')}><span className="metric-label">BOT STATUS <Gauge size={16} /></span><span className="metric-main">{status?.bot_status === 'on' ? 'ON' : status?.bot_status === 'off' ? 'OFF' : 'UNKNOWN'}</span><span className="metric-sub"><span className="metric-status-dot" /> {status?.mt5_connected ? 'CONNECTED' : 'NO BOT CONNECTION'}</span><ChevronRight size={14} className="metric-chevron" /></button>
            <button type="button" className="monitor-metric" onClick={() => inform(status?.last_trade_time ? `Last trade: ${status.last_trade_time}` : 'Last trade time is unavailable until a trade feed is connected.')}><span className="metric-label">LAST TRADE TIME <Clock3 size={16} /></span><span className="metric-main">{time(status?.last_trade_time)}</span><span className="metric-sub">{status?.last_trade_time ? 'LOCAL TIME' : 'AWAITING TRADE FEED'}</span><ChevronRight size={14} className="metric-chevron" /></button>
            <button type="button" className="monitor-metric" onClick={() => inform(typeof pnl === 'number' ? `P/L today: ${pnl}. Currency not specified by source.` : 'Today’s P/L is unavailable until a trade feed is connected.')}><span className="metric-label">P/L TODAY <Wallet size={16} /></span><span className="metric-main">{typeof pnl === 'number' ? pnl.toFixed(2) : '—'}</span><span className="metric-sub">{typeof pnl === 'number' ? 'CURRENCY NOT SPECIFIED' : 'AWAITING TRADE FEED'}</span><ChevronRight size={14} className="metric-chevron" /></button>
          </div>
        </section>
        <div className="monitor-grid">
          <section className="feed-panel panel" id="live-trades"><div className="panel-heading"><div><div className="section-eyebrow">YOUR ACTIVITY <span>02</span></div><h2>Recent trades<span>.</span></h2><p>Trade activity from your connected account.</p></div><button type="button" className="icon-action" onClick={() => void poll(true)} disabled={refreshing} aria-label="Refresh recent trades" title="Refresh recent trades" aria-busy={refreshing}><RefreshCw size={15} className={refreshing ? 'spin' : ''} /></button></div><div className="table-scroll"><table><thead><tr><th>TIME</th><th>PAIR</th><th>ACTION</th><th>PRICE</th><th>PROFIT</th></tr></thead><tbody>{trades?.available && trades.trades.length > 0 ? trades.trades.map((trade, index) => <tr key={`${trade.time}-${index}`}><td>{time(trade.time)}</td><td>{trade.pair}</td><td>{trade.action}</td><td>{trade.price}</td><td>{trade.profit}</td></tr>) : <tr><td colSpan={5}><div className="table-empty"><span className="empty-icon"><BarChart3 size={20} /></span><strong>{trades?.available ? 'No recent trades' : 'No trade feed connected'}</strong><p>{trades?.message || 'Checking the trade feed…'}</p></div></td></tr>}</tbody></table></div><div className="panel-bottom"><span><Database size={13} /> {trades?.available ? 'TRADE FEED CONNECTED' : 'AWAITING CONNECTION'}</span><span>LAST CHECK {time(trades?.checked_at)}</span></div></section>
          <section className="console-panel panel" id="activity-logs"><div className="panel-heading"><div><div className="section-eyebrow">SYSTEM ACTIVITY <span>03</span></div><h2>Diagnostics<span>.</span></h2><p>Actual API polling events in this browser session.</p></div><div className="console-actions"><button type="button" className="icon-action" onClick={togglePolling} aria-label={paused ? 'Resume automatic refresh' : 'Pause automatic refresh'} title={paused ? 'Resume automatic refresh' : 'Pause automatic refresh'}>{paused ? <Play size={15} /> : <Pause size={15} />}</button><button type="button" className="icon-action" onClick={clearLogs} aria-label="Clear session diagnostics" title="Clear session diagnostics"><Trash2 size={15} /></button></div></div><div className="console-window"><div className="console-title"><span><TerminalSquare size={14} /> SESSION DIAGNOSTICS</span><span className="console-live"><i /> {paused ? 'PAUSED' : 'AUTO · 3S'}</span></div><div className="console-body" role="log" aria-label="Diagnostic events" aria-live="off">{logs.length ? logs.map(log => <div className="log-row" key={log.id}><time>{time(log.timestamp)}</time><span className="log-level">{log.level}</span><span>{log.message}</span></div>) : <div className="console-empty">No session events yet. {paused ? 'Resume polling or refresh to fetch diagnostics.' : 'Waiting for the next request.'}</div>}</div><div className="console-source"><CircleHelp size={12} /> {logSource}</div></div></section>
        </div>
        <section className="api-panel panel" id="api-checks"><div className="api-panel-copy"><div className="api-icon"><Braces size={18} /></div><div><div className="section-eyebrow">CONNECTION TOOLS <span>04</span></div><h2>Test your endpoints<span>.</span></h2><p>Run a live request and inspect the actual JSON response.</p></div></div><div className="api-buttons"><button type="button" onClick={() => void testApi('status')} disabled={testing !== null} aria-busy={testing === 'status'}>{testing === 'status' ? <LoaderCircle size={14} className="spin" /> : <Radio size={14} />} {testing === 'status' ? 'Testing…' : 'Test status API'} <ArrowRight size={14} /></button><button type="button" onClick={() => void testApi('brain')} disabled={testing !== null} aria-busy={testing === 'brain'}>{testing === 'brain' ? <LoaderCircle size={14} className="spin" /> : <Activity size={14} />} {testing === 'brain' ? 'Testing…' : 'Test brain API'} <ArrowRight size={14} /></button></div>{apiOutput && <div className="api-response"><div><span>RESPONSE / {apiOutput.endpoint}</span><button type="button" className="text-action" onClick={() => { setApiOutput(null); inform('API response closed.'); }}>Close <span aria-hidden="true">×</span></button></div><pre>{JSON.stringify(apiOutput.body, null, 2)}</pre></div>}</section>
        <footer className="monitor-footer"><span><span className="footer-symbol">✳</span> TRADING BRAIN <i>/</i> YOUR SYSTEM. YOUR EDGE.</span><span>BUILT FOR CLARITY <i>•</i> NOT FINANCIAL ADVICE</span><a href="/playbook" onClick={nav('playbook')}>VIEW PLAYBOOK <ArrowDownRight size={13} /></a></footer>
      </div>
    </main>
  </div>;
}
