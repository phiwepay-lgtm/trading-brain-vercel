'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ChartPane, { type Bar, type Marker, type PaneHandle } from './pane';
import { aggregateMinute, applyTick, mergeBars } from '../../lib/chart-math.mjs';

type SymbolCode = 'XAUUSD' | 'EURUSD' | 'BTCUSD';
type Tick = { symbol: SymbolCode; time: number; last: number; bid: number | null; ask: number | null };
const names: Record<SymbolCode, string> = { XAUUSD: 'Gold / US Dollar', EURUSD: 'Euro / US Dollar', BTCUSD: 'Bitcoin / US Dollar' };
const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
function format(n: number | null | undefined, symbol: SymbolCode) { return n == null ? '—' : n.toFixed(symbol === 'EURUSD' ? 5 : 2); }
function timestamp(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value > 1e12 ? value / 1000 : value);
  if (typeof value === 'string' && /^\d{10,13}$/.test(value)) return timestamp(Number(value));
  if (typeof value !== 'string' || !/(Z|[+-]\d\d:\d\d)$/i.test(value)) return null;
  const ms = Date.parse(value); return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}
function journalMarkers(json: unknown, symbol: SymbolCode) {
  const trades = Array.isArray(json) ? json : (json && typeof json === 'object' && Array.isArray((json as any).trades) ? (json as any).trades : null);
  if (!trades || trades.length > 10000) throw new Error('Expected a JSON array or { "trades": [...] } with at most 10,000 trades.');
  const marks: Marker[] = []; let skipped = 0;
  for (const trade of trades) {
    if (!trade || typeof trade !== 'object') { skipped++; continue; }
    const s = String(trade.symbol ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    if (s !== symbol) { skipped++; continue; }
    const side = String(trade.side ?? trade.direction ?? trade.type ?? '').toUpperCase();
    const entryTime = timestamp(trade.entry_time ?? trade.entryTime ?? trade.open_time ?? trade.openTime);
    const exitTime = timestamp(trade.exit_time ?? trade.exitTime ?? trade.close_time ?? trade.closeTime);
    const entryPrice = Number(trade.entry_price ?? trade.entryPrice ?? trade.entry), exitPrice = Number(trade.exit_price ?? trade.exitPrice ?? trade.exit);
    if (!['BUY', 'SELL'].includes(side) || !entryTime || !Number.isFinite(entryPrice) || entryPrice <= 0) { skipped++; continue; }
    marks.push({ time: entryTime, price: entryPrice, label: `${side === 'BUY' ? '▲' : '▼'} ${side} entry`, color: side === 'BUY' ? '#35ddb1' : '#ff8591' });
    if (exitTime && Number.isFinite(exitPrice) && exitPrice > 0) { const pnl = trade.pnl ?? trade.profit; const pl = pnl !== undefined && pnl !== null && pnl !== '' && Number.isFinite(Number(pnl)) ? ` · P/L ${Number(pnl).toFixed(2)}` : ''; marks.push({ time: exitTime, price: exitPrice, label: `● Exit${pl}`, color: '#efc75c' }); }
  }
  return { marks, skipped, total: trades.length };
}

export default function ChartWorkspace() {
  const [symbol, setSymbol] = useState<SymbolCode>('XAUUSD'), [token, setToken] = useState(''), [tokenInput, setTokenInput] = useState('');
  const [m1, setM1] = useState<Bar[]>([]), [m5, setM5] = useState<Bar[]>([]), [dataState, setDataState] = useState('Checking market data configuration…'), [streamState, setStreamState] = useState('offline');
  const [tick, setTick] = useState<Tick | null>(null), [now, setNow] = useState(Date.now()), [sync, setSync] = useState(true), [settings, setSettings] = useState(false);
  const [hasMore, setHasMore] = useState({ M1: true, M5: true }), [loadingMore, setLoadingMore] = useState({ M1: false, M5: false });
  const [journal, setJournal] = useState<unknown>(null), [journalMessage, setJournalMessage] = useState('No journal loaded');
  const pane1 = useRef<PaneHandle>(null), pane5 = useRef<PaneHandle>(null), m1Ref = useRef<Bar[]>([]), m5Ref = useRef<Bar[]>([]), generation = useRef(0), fetching = useRef({ M1: false, M5: false }), lastTick = useRef(0);
  const writeBars = (tf: 'M1' | 'M5', bars: Bar[]) => { if (tf === 'M1') { m1Ref.current = bars; setM1(bars); } else { m5Ref.current = bars; setM5(bars); } };
  useEffect(() => { try { setToken(sessionStorage.getItem('chart-access-token') || ''); } catch {} }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(id); }, []);
  useEffect(() => {
    const controller = new AbortController(), current = ++generation.current;
    fetching.current = { M1: false, M5: false }; lastTick.current = 0; writeBars('M1', []); writeBars('M5', []); setTick(null); setStreamState('offline'); setHasMore({ M1: true, M5: true }); setLoadingMore({ M1: false, M5: false }); setDataState('Loading candles…');
    async function start() {
      try {
        const fetchLatest = () => Promise.all((['M5', 'M1'] as const).map(async tf => {
          const response = await fetch(`/api/chart/candles?symbol=${symbol}&timeframe=${tf}`, { headers: headers(token), cache: 'no-store', signal: controller.signal });
          const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Market data unavailable.');
          if (!Array.isArray(body)) throw new Error('Invalid market data response.'); return body as Bar[];
        }));
        const results = await fetchLatest();
        if (current !== generation.current) return;
        writeBars('M5', results[0]); writeBars('M1', results[1]); setHasMore({ M5: results[0].length >= 500, M1: results[1].length >= 500 }); setDataState('Historical candles loaded · waiting for stream');
        // The browser receives a same-origin SSE relay; the provider key never leaves the server.
        const wait = (ms: number) => new Promise<void>(resolve => {
          const done = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', done); resolve(); };
          const timer = setTimeout(done, ms); controller.signal.addEventListener('abort', done, { once: true });
          if (controller.signal.aborted) done();
        });
        let delay = 1500, reconnect = false;
        while (!controller.signal.aborted) {
          if (reconnect) {
            try {
              const fresh = await fetchLatest();
              if (controller.signal.aborted) return;
              writeBars('M5', mergeBars(m5Ref.current, fresh[0])); writeBars('M1', mergeBars(m1Ref.current, fresh[1]));
              setDataState('History refreshed · reconnecting stream');
            } catch {
              if (controller.signal.aborted) return;
              setDataState('History refresh failed; streaming paused to avoid gaps.');
              await wait(delay);
              delay = Math.min(delay * 2, 15000); continue;
            }
          }
          setStreamState('connecting');
          let reader: ReadableStreamDefaultReader<string> | null = null;
          try {
            const response = await fetch(`/api/chart/stream?symbol=${symbol}`, { headers: headers(token), cache: 'no-store', signal: controller.signal });
            if (!response.ok || !response.body) throw new Error('Stream unavailable');
            reader = response.body.pipeThrough(new TextDecoderStream()).getReader(); let buffer = '';
            while (!controller.signal.aborted) {
              const { value, done } = await reader.read(); if (done) break; buffer += value;
              if (buffer.length > 65536) throw new Error('Invalid stream');
              let i: number; while ((i = buffer.indexOf('\n\n')) !== -1) {
                const part = buffer.slice(0, i); buffer = buffer.slice(i + 2);
                const event = part.match(/^event: (.+)$/m)?.[1], raw = part.match(/^data: (.+)$/m)?.[1]; if (!raw) continue;
                const payload = JSON.parse(raw);
                if (event === 'status') { setStreamState(payload.state); if (payload.state === 'subscribed') delay = 1500; }
                if (event === 'tick' && payload.symbol === symbol && Number.isInteger(payload.time) && payload.time >= lastTick.current && Number.isFinite(payload.last) && payload.last > 0) {
                  const next1 = applyTick(m1Ref.current, payload, 60); if (next1 === m1Ref.current) continue;
                  const next5 = aggregateMinute(m5Ref.current, next1[next1.length - 1]); if (next5 === m5Ref.current) continue;
                  lastTick.current = payload.time; writeBars('M1', next1); writeBars('M5', next5); setTick(payload); setNow(Date.now()); setStreamState('receiving'); setDataState('Candles and ticker use the same provider stream');
                }
              }
            }
          } catch (error) { if (controller.signal.aborted) return; }
          finally { if (reader) void reader.cancel().catch(() => {}); }
          if (controller.signal.aborted) return;
          reconnect = true; setStreamState('reconnecting'); await wait(delay); delay = Math.min(delay * 2, 15000);
        }
      } catch (error) { if (!controller.signal.aborted && current === generation.current) { setDataState(error instanceof Error ? error.message : 'Market data unavailable.'); setStreamState('offline'); } }
    }
    start(); return () => { controller.abort(); };
  }, [symbol, token]);

  const history = useCallback(async (tf: 'M1' | 'M5') => {
    const bars = tf === 'M1' ? m1Ref.current : m5Ref.current;
    if (!bars.length || fetching.current[tf] || !hasMore[tf]) return;
    const current = generation.current; fetching.current[tf] = true; setLoadingMore(v => ({ ...v, [tf]: true }));
    try {
      const response = await fetch(`/api/chart/candles?symbol=${symbol}&timeframe=${tf}&before=${bars[0].time}`, { headers: headers(token), cache: 'no-store' });
      const data = await response.json(); if (!response.ok || !Array.isArray(data)) throw new Error(data.error || 'History unavailable');
      if (current !== generation.current) return;
      const currentBars = tf === 'M1' ? m1Ref.current : m5Ref.current; const older = data.filter((b: Bar) => b.time < currentBars[0].time);
      writeBars(tf, mergeBars(older, currentBars)); if (older.length < 500) setHasMore(v => ({ ...v, [tf]: false }));
    } catch (error) { if (current === generation.current) setDataState(error instanceof Error ? error.message : 'Earlier candles unavailable.'); }
    finally { if (current === generation.current) { fetching.current[tf] = false; setLoadingMore(v => ({ ...v, [tf]: false })); } }
  }, [symbol, token, hasMore]);
  const handleCrosshair = useCallback((source: string, time: number | null, price: number) => { if (sync) (source === 'M1' ? pane5 : pane1).current?.crosshair(time, price); }, [sync]);
  const handleRange = useCallback((source: string, range: any) => { if (sync) (source === 'M1' ? pane5 : pane1).current?.range(range); }, [sync]);
  let markers: Marker[] = []; let journalSummary = journalMessage; if (journal) { try { const result = journalMarkers(journal, symbol); markers = result.marks; journalSummary = `${result.marks.length} markers · ${result.skipped} skipped / ${result.total} trades for ${symbol}`; } catch {} }
  const live = streamState === 'receiving' && tick !== null && now / 1000 - tick.time < 30 && now / 1000 - tick.time > -30;
  const connect = (e: React.FormEvent) => { e.preventDefault(); try { sessionStorage.setItem('chart-access-token', tokenInput); } catch {} setToken(tokenInput); setTokenInput(''); };
  const loadJournal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    if (file.size > 5_000_000) { setJournalMessage('Journal must be under 5 MB.'); return; }
    try { const parsed = JSON.parse(await file.text()); const result = journalMarkers(parsed, symbol); setJournal(parsed); setJournalMessage(`${result.marks.length} markers · ${result.skipped} skipped / ${result.total} trades for ${symbol}`); }
    catch (error) { setJournal(null); setJournalMessage(error instanceof Error ? error.message : 'Could not read journal.'); }
  };
  return <main className="chart-workspace">
    <header className="chart-topbar"><Link className="chart-brand" href="/chart"><span className="brand-mark">◈</span><span>TRADING<span className="brand-muted">BRAIN</span><small>WORKSPACE</small></span></Link><nav aria-label="Main navigation"><Link href="/chart" className="active">Charts</Link><Link href="/dashboard">Monitor</Link><Link href="/brain">Assessment</Link><Link href="/ea">EA</Link></nav><div className="top-meta"><span className="status-dot" /> MT5 OFFLINE <span className="top-divider"/> SCANNING OFF</div></header>
    <div className="workspace-content"><div className="workspace-heading"><div><div className="eyebrow">MARKET WORKSPACE <span>/</span> DUAL TIMEFRAME</div><h1>Chart workspace<span>.</span></h1><p>One market. Two perspectives. Your setup, in focus.</p></div><div className="heading-actions"><button onClick={() => setSync(!sync)} className={sync ? 'active-control' : ''} aria-pressed={sync}>⛓ &nbsp;Sync {sync ? 'on' : 'off'}</button><button onClick={() => setSettings(v => !v)} aria-expanded={settings}>⚙ &nbsp;Settings</button></div></div>
    {settings && <div className="settings-note"><strong>Chart settings</strong><span>Times are UTC. EMA is calculated from real closes, including when Heiken Ashi is displayed. Candle type and EMA can be changed in each pane.</span><button onClick={() => { try { sessionStorage.removeItem('chart-access-token'); } catch {} setToken(''); setTick(null); }}>Forget access token</button></div>}
    <div className="market-bar"><div className="market-select"><span className="market-icon">◇</span><div><label htmlFor="symbol-select">SYMBOL</label><select id="symbol-select" value={symbol} onChange={e => setSymbol(e.target.value as SymbolCode)}><option value="XAUUSD">XAUUSD</option><option value="EURUSD">EURUSD</option><option value="BTCUSD">BTCUSD</option></select></div><span className="market-name">{names[symbol]}</span></div><div className="quote-strip"><div><small>BID</small><strong>{format(tick?.bid, symbol)}</strong></div><div><small>ASK</small><strong>{format(tick?.ask, symbol)}</strong></div><div><small>LAST</small><strong>{format(tick?.last, symbol)}</strong></div><div className={`feed-status ${live ? 'live' : ''}`}><i />{live ? 'STREAMING' : streamState === 'receiving' ? 'STALE' : streamState.toUpperCase()}<small>{tick ? `Tick ${new Date(tick.time * 1000).toISOString().replace('T', ' ').slice(0, 19)} UTC` : 'Awaiting provider tick'}</small></div></div></div>
    <div className="feed-notice" role="status"><span>{dataState}</span><span>Bid/ask shown only when supplied by the feed. HA close is synthetic and may differ from last.</span></div>
    {!token && <form className="chart-access" onSubmit={connect}><label htmlFor="chart-token">Chart access token</label><input id="chart-token" type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="Enter the server-configured access token" minLength={24} required autoComplete="off"/><button type="submit">Connect data</button><span>Kept in this browser session; never put the provider API key here.</span></form>}
    <div className="chart-grid"><ChartPane key={`${symbol}-M5`} ref={pane5} symbol={symbol} timeframe="M5" bars={m5} markers={markers} onCrosshair={handleCrosshair} onRange={handleRange} onHistory={() => history('M5')} hasMore={hasMore.M5} loadingMore={loadingMore.M5}/><ChartPane key={`${symbol}-M1`} ref={pane1} symbol={symbol} timeframe="M1" bars={m1} markers={markers} onCrosshair={handleCrosshair} onRange={handleRange} onHistory={() => history('M1')} hasMore={hasMore.M1} loadingMore={loadingMore.M1} onCopy={() => pane5.current?.addDrawings(pane1.current?.copyDrawings() || [])}/></div>
    <div className="workspace-bottom"><div><span className="bottom-icon">↗</span><div><strong>Trade journal markers</strong><p>{journalSummary}. JSON stays in this browser and is never used for performance statistics.</p></div></div><div className="journal-actions"><label className="upload-button">Upload JSON<input type="file" accept=".json,application/json" onChange={loadJournal}/></label>{journal && <button onClick={() => { setJournal(null); setJournalMessage('No journal loaded'); }}>Clear</button>}</div></div>
    <footer className="chart-footer"><span>Market data is provider-dependent and may be delayed or unavailable. Not financial advice.</span><span>NO MT5 CONNECTION &nbsp;·&nbsp; NO AUTOMATED SCANNING</span></footer></div>
  </main>;
}
