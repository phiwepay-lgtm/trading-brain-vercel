'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ChartPane, { type Bar, type Marker, type PaneHandle } from './pane';
import JournalTable from '../components/journal-table';
import { useJournal } from '../components/journal-store';
import { useJournalFilters } from '../components/journal-filters';
import { filterTrades } from '../../lib/journal-filter.mjs';
import { mapJournalMarkers } from '../../lib/journal-markers';
import { tradeFocus, tradeSymbol, tradeTimestamp } from '../../lib/journal';
import { aggregateMinute, applyTick, mergeBars } from '../../lib/chart-math.mjs';
import { demoPrice } from '../../lib/demo-feed.mjs';
import { useChartData } from '../../lib/chart-store';
import { calculateHeikinAshi } from '../../lib/indicators/heikinAshi';
import { confirmedPivots } from '../../lib/indicators/pivots';
import { defaultResearchParams, replayResearch, validResearchParams, inResearchSession } from '../../lib/strategy/research.mjs';
import ResearchPanel, { type ResearchParams, type ResearchResult } from './research-panel';

type SymbolCode = 'XAUUSD' | 'EURUSD' | 'BTCUSD';
type Source = 'twelvedata' | 'binance' | 'demo';
type Tick = { symbol: SymbolCode; time: number; last: number; bid: number | null; ask: number | null };
type Focus = { time: number; approximate: boolean; index: number };
const names: Record<SymbolCode,string> = {XAUUSD:'Gold / US Dollar',EURUSD:'Euro / US Dollar',BTCUSD:'Bitcoin / US Dollar'};
const headers = (token: string) => token ? {Authorization:`Bearer ${token}`} : {};
function format(n: number | null | undefined, symbol: SymbolCode) { return n == null ? '—' : n.toFixed(symbol === 'EURUSD' ? 5 : 2); }

export default function ChartWorkspace() {
  const [symbol,setSymbol] = useState<SymbolCode>('BTCUSD'), [token,setToken] = useState(''), [tokenInput,setTokenInput] = useState('');
  const [forceDemo,setForceDemo] = useState(false), [source,setSource] = useState<Source>('demo'), [instrument,setInstrument] = useState('SIMULATED');
  const m1 = useChartData(s => s.m1), m5 = useChartData(s => s.m5), setBars = useChartData(s => s.setBars);
  const [dataState,setDataState] = useState('Loading chart data…'), [streamState,setStreamState] = useState('loading');
  const [historyStatus,setHistoryStatus] = useState('Preparing research history…'), [showPivots,setShowPivots] = useState(true), [showLevels,setShowLevels] = useState(true);
  const [researchParams,setResearchParams] = useState<ResearchParams>({...defaultResearchParams}), [showSignals,setShowSignals] = useState(true), [showSessions,setShowSessions] = useState(false), [showHAOverlay,setShowHAOverlay] = useState(false);
  const [tick,setTick] = useState<Tick | null>(null), [sync,setSync] = useState(true), [showTrades,setShowTrades] = useState(true), [settings,setSettings] = useState(false), [focus,setFocus] = useState<Focus | null>(null);
  const [view,setView] = useState<'both'|'M1'|'M5'>('both');
  const [hasMore,setHasMore] = useState({M1:true,M5:true}), [loadingMore,setLoadingMore] = useState({M1:false,M5:false});
  const {journal} = useJournal(); const {filters} = useJournalFilters();
  const filtered = useMemo(() => filterTrades(journal?.trades ?? [], filters), [journal, filters]);
  const journalMarkers = useMemo(() => showTrades ? mapJournalMarkers(filtered, symbol) : [], [filtered, symbol, showTrades]); const searchParams = useSearchParams(); const selectedId = searchParams.get('trade');
  const pane1 = useRef<PaneHandle>(null), pane5 = useRef<PaneHandle>(null), m1Ref = useRef<Bar[]>([]), m5Ref = useRef<Bar[]>([]), generation = useRef(0), fetching = useRef({M1:false,M5:false}), lastTick = useRef(0), initializedRange = useRef(0);
  const writeBars = (tf: 'M1'|'M5', bars: Bar[]) => { if (tf === 'M1') m1Ref.current=bars; else m5Ref.current=bars; setBars(tf,bars); };
  useEffect(() => {try {setToken(sessionStorage.getItem('chart-access-token') || '');} catch {}},[]);
  useEffect(() => {
    const q=new URLSearchParams(window.location.search), next:any={...defaultResearchParams}; let malformed=false;
    for (const [key,initial] of Object.entries(defaultResearchParams)) {
      const value=q.get(`tb_${key}`); if (value===null) continue;
      if (typeof initial==='boolean') { if (value!=='true' && value!=='false') {malformed=true;break;} next[key]=value==='true'; }
      else if (typeof initial==='number') next[key]=value.trim()===''?NaN:Number(value);
      else next[key]=value;
    }
    if (!malformed && validResearchParams(next)) setResearchParams(next);
  },[]);
  const applyResearch = (next:ResearchParams) => {
    setResearchParams(next); const url=new URL(window.location.href);
    for (const [key,value] of Object.entries(next)) url.searchParams.set(`tb_${key}`,String(value));
    window.history.replaceState(null,'',url);
  };

  useEffect(() => {
    if (!journal || selectedId === null || !/^\d+$/.test(selectedId)) return;
    const index = Number(selectedId), trade = journal.trades[index], at = trade && tradeFocus(trade), code = trade && tradeSymbol(trade.symbol ?? trade.pair);
    if (at && code) { setSymbol(code); setFocus({...at,index}); }
  },[journal,selectedId]);
  useEffect(() => {
    const controller = new AbortController(), current = ++generation.current;
    fetching.current={M1:false,M5:false}; lastTick.current=0; writeBars('M1',[]); writeBars('M5',[]); setTick(null); setStreamState('loading'); setHasMore({M1:true,M5:true}); setLoadingMore({M1:false,M5:false}); setDataState('Loading chart data…'); setHistoryStatus('Preparing research history…');
    const getCandles = async (tf: 'M1'|'M5', selected?: Source, before?: number) => {
      const params = new URLSearchParams({symbol,timeframe:tf}); if (selected) params.set('source',selected);
      if (before !== undefined) params.set('before',String(before));
      else if (focus) params.set('before',String(Math.min(4102444800, focus.time + (tf === 'M1' ? 60 : 300)*150)));
      const response = await fetch(`/api/chart/candles?${params}`,{headers:headers(token),cache:'no-store',signal:controller.signal});
      const body = await response.json(); if (!response.ok || !Array.isArray(body)) throw new Error('Candles unavailable');
      const feed = (response.headers.get('X-Chart-Source') || selected || 'twelvedata') as Source;
      if (!['demo','binance','twelvedata'].includes(feed) || (selected && feed !== selected)) throw new Error('Source mismatch');
      return {bars:body as Bar[],feed,instrument:response.headers.get('X-Chart-Instrument') || (feed === 'demo' ? `${symbol} SIMULATED` : symbol)};
    };
    const update = (payload: Tick) => {
      if (payload.symbol !== symbol || !Number.isInteger(payload.time) || payload.time < lastTick.current || !Number.isFinite(payload.last) || payload.last <= 0) return;
      if (!focus) {
        const one = applyTick(m1Ref.current,payload,60); if (one === m1Ref.current) return;
        const five = aggregateMinute(m5Ref.current,one[one.length-1]); if (five === m5Ref.current) return;
        writeBars('M1',one); writeBars('M5',five);
      }
      lastTick.current=payload.time; setTick(payload);
    };
    const wait = (ms: number) => new Promise<void>(resolve => { const done = () => {clearTimeout(timer);controller.signal.removeEventListener('abort',done);resolve();}; const timer=setTimeout(done,ms); controller.signal.addEventListener('abort',done,{once:true}); if (controller.signal.aborted) done(); });
    async function start() {
      try {
        let one, five;
        try { one=await getCandles('M1',forceDemo?'demo':undefined); five=await getCandles('M5',one.feed); if (focus && (!one.bars.some(b=>b.time===Math.floor(focus.time/60)*60) || !five.bars.some(b=>b.time===Math.floor(focus.time/300)*300))) throw new Error('Selected time outside provider history'); }
        catch { if (controller.signal.aborted) return; one=await getCandles('M1','demo'); five=await getCandles('M5','demo'); }
        if (current !== generation.current || controller.signal.aborted) return;
        const selected=one.feed; setSource(selected); setInstrument(one.instrument); writeBars('M1',one.bars); writeBars('M5',five.bars);
        setHasMore({M1:one.bars.length>=500,M5:five.bars.length>=500});
        // Page within the chosen source only. Short or unavailable provider history is reported,
        // never padded with another feed. Stream updates may arrive while pages are loading.
        let nextHistoryPage = Date.now();
        const fill = async (tf: 'M1'|'M5', target: number) => {
          fetching.current[tf]=true; setLoadingMore(v=>({...v,[tf]:true}));
          try {
            for (let page=0; page<10 && !controller.signal.aborted; page++) {
              const existing=tf==='M1'?m1Ref.current:m5Ref.current;
              if (existing.length>=target || !existing.length) break;
              if (selected === 'twelvedata') {
                const slot = Math.max(Date.now(), nextHistoryPage); nextHistoryPage=slot+10000;
                await wait(slot-Date.now()); if (controller.signal.aborted) return;
              }
              const olderPage=await getCandles(tf,selected,existing[0].time);
              if (current!==generation.current || controller.signal.aborted) return;
              const latest=tf==='M1'?m1Ref.current:m5Ref.current;
              const older=olderPage.bars.filter(b=>b.time<latest[0].time);
              if (older.length) writeBars(tf,mergeBars(older,latest));
              if (older.length<500) {setHasMore(v=>({...v,[tf]:false}));break;}
            }
          } finally {
            if (current===generation.current) {fetching.current[tf]=false;setLoadingMore(v=>({...v,[tf]:false}));}
          }
        };
        void Promise.allSettled([fill('M1',2000),fill('M5',5000)]).then(results=>{
          if (current!==generation.current || controller.signal.aborted) return;
          const short=m1Ref.current.length<2000 || m5Ref.current.length<5000;
          setHistoryStatus(results.some(r=>r.status==='rejected') ? 'Some research history could not be loaded; showing available candles.' : short ? 'Provider returned less than the requested research history.' : 'Research history loaded.');
        });
        setDataState(selected === 'demo' ? 'Using demo feed — simulated prices. Add TWELVE_DATA_API_KEY for provider data.' : selected === 'binance' ? `Binance ${one.instrument} proxy — not ${symbol}; USDT is not USD. Quotes are polled.` : 'Twelve Data history loaded. Waiting for provider stream.');
        if (selected === 'demo') {
          setStreamState('demo');
          while (!controller.signal.aborted) {const time=Math.floor(Date.now()/1000/5)*5; update({symbol,time,last:demoPrice(symbol,time),bid:null,ask:null}); await wait(5000);}
          return;
        }
        if (selected === 'binance' || focus) {
          setStreamState('polling');
          while (!controller.signal.aborted) {
            try { const res=await fetch(`/api/chart/price?symbol=${symbol}&source=${selected}`,{headers:headers(token),cache:'no-store',signal:controller.signal}); const quote=await res.json(); if (!res.ok || quote.source !== selected || !Number.isFinite(quote.last)) throw new Error(); update({symbol,time:quote.time,last:quote.last,bid:quote.bid,ask:quote.ask}); }
            catch { if (!controller.signal.aborted) {setDataState('Provider price unavailable; switching to demo.');setForceDemo(true);} return; }
            await wait(5000);
          }
          return;
        }
        // Server-side WebSocket relay; if it fails, switch the whole workspace to demo, not mixed feeds.
        setStreamState('connecting');
        const streamAbort = new AbortController(); const stop = () => streamAbort.abort(); controller.signal.addEventListener('abort',stop,{once:true});
        let watchdog = setTimeout(stop,15000), reader: ReadableStreamDefaultReader<string> | null=null;
        try {
          const res=await fetch(`/api/chart/stream?symbol=${symbol}`,{headers:headers(token),cache:'no-store',signal:streamAbort.signal}); if (!res.ok || !res.body) throw new Error();
          reader=res.body.pipeThrough(new TextDecoderStream()).getReader(); let buffer='';
          while (!controller.signal.aborted) {
            const {value,done}=await reader.read(); if (done) throw new Error(); buffer+=value; if (buffer.length>65536) throw new Error();
            let i; while ((i=buffer.indexOf('\n\n'))!==-1) {const part=buffer.slice(0,i);buffer=buffer.slice(i+2);const event=part.match(/^event: (.+)$/m)?.[1],raw=part.match(/^data: (.+)$/m)?.[1];if(!raw)continue;const payload=JSON.parse(raw);
              if (event==='status' && payload.state==='unavailable') throw new Error();
              if (event==='tick') {clearTimeout(watchdog);update(payload);setStreamState('streaming');setDataState('Twelve Data stream · quotes depend on provider entitlement and latency.');}
            }
          }
        } catch { if (!controller.signal.aborted) {setDataState('Stream unavailable; switching to demo.');setForceDemo(true);} }
        finally {clearTimeout(watchdog);controller.signal.removeEventListener('abort',stop);streamAbort.abort();if(reader)void reader.cancel().catch(()=>{});}
      } catch {if (!controller.signal.aborted) {setDataState('Could not load chart data. Please retry.');setStreamState('offline');}}
    }
    void start(); return () => controller.abort();
  },[symbol,token,forceDemo,focus]);
  useEffect(() => {
    if (!m1.length || !m5.length || initializedRange.current === generation.current || !sync) return;
    initializedRange.current = generation.current;
    const from = focus ? Math.floor((focus.time - 3600)/300)*300 : Math.floor(m1[Math.max(0,m1.length-120)].time/300)*300;
    const to = focus ? Math.floor((focus.time + 3600)/300)*300 : Math.floor(m1[m1.length-1].time/300)*300 + 300;
    const frame=requestAnimationFrame(() => {pane1.current?.range({from:from as any,to:to as any});pane5.current?.range({from:from as any,to:to as any});});
    return () => cancelAnimationFrame(frame);
  }, [m1,m5,focus,sync]);
  const history = useCallback(async (tf: 'M1'|'M5') => {
    const bars=tf==='M1'?m1Ref.current:m5Ref.current; if(!bars.length||fetching.current[tf]||!hasMore[tf])return;
    const current=generation.current;fetching.current[tf]=true;setLoadingMore(v=>({...v,[tf]:true}));
    try {const res=await fetch(`/api/chart/candles?symbol=${symbol}&timeframe=${tf}&source=${source}&before=${bars[0].time}`,{headers:headers(token),cache:'no-store'});const data=await res.json();if(!res.ok||!Array.isArray(data))throw new Error('Earlier candles unavailable.');if(current!==generation.current)return;const existing=tf==='M1'?m1Ref.current:m5Ref.current, older=data.filter((b:Bar)=>b.time<existing[0].time);writeBars(tf,mergeBars(older,existing));if(older.length<500)setHasMore(v=>({...v,[tf]:false}));}
    catch(error){if(current===generation.current)setDataState(error instanceof Error?error.message:'Earlier candles unavailable.');}
    finally{if(current===generation.current){fetching.current[tf]=false;setLoadingMore(v=>({...v,[tf]:false}));}}
  },[symbol,token,source,hasMore]);
  const crosshair=useCallback((from:string,time:number|null,price:number)=>{if(sync)(from==='M1'?pane5:pane1).current?.crosshair(time,price);},[sync]);
  const range=useCallback((from:string,value:any)=>{if(sync)(from==='M1'?pane5:pane1).current?.range(value);},[sync]);
  // Close-only research overlays. Pivot markers are placed retrospectively on the pivot
  // candle, although they become known only after the right-hand candles close.
  const research = useMemo(() => {
    const cutoff = Math.floor(Date.now()/1000);
    const closed1 = m1.filter(b => b.time + 60 <= cutoff);
    const closed5 = m5.filter(b => b.time + 300 <= cutoff);
    const ha = calculateHeikinAshi(closed5);
    const pivotMarkers = (bars: Bar[], isHA: boolean): Marker[] => {
      if (!showPivots || !bars.length) return [];
      const left=isHA?researchParams.m5Left:researchParams.m1Left, right=isHA?researchParams.m5Right:researchParams.m1Right;
      return [true,false].flatMap(high => confirmedPivots(bars,bars.length-1,left,right,high).map(p => ({time:p.time!,price:p.value!,label:isHA ? (high?'HA H':'HA L') : (high?'H':'L'),color:high?'#f59ca8':'#72ddc5',shape:high?'above' as const:'below' as const})));
    };
    return {one:pivotMarkers(closed1,false),five:pivotMarkers(ha,true)};
  },[m1,m5,showPivots,researchParams]);
  const replay = useMemo((): {result:ResearchResult|null;error:string|null} => {
    if (!m1.length || !m5.length) return {result:null,error:null};
    try {const cutoff=Math.floor(Date.now()/1000);return {result:replayResearch(m1.filter(b=>b.time+60<=cutoff),m5,researchParams) as ResearchResult,error:null};}
    catch (error) {return {result:null,error:error instanceof Error?error.message:'Invalid data'};}
  },[m1,m5,researchParams]);
  const eventMarkers: Marker[] = showSignals ? (replay.result?.events ?? []).filter(e=>e.price!=null).map(e=>({time:e.time,price:e.price!,label:e.kind==='ENTRY'?(e.direction===1?'BUY candidate':'SELL candidate'):e.kind,color:e.kind==='ENTRY'?'#f7cb58':e.kind==='FTB'?'#df84ea':'#83baff'})) : [];
  const sessionTimes = useMemo(() => {
    if (!showSessions) return {one:new Set<number>(),five:new Set<number>()};
    const p={...researchParams,bypassSession:false,sessionsConfirmed:true};
    return {one:new Set(m1.filter(b=>inResearchSession(b.time,p)).map(b=>b.time)),five:new Set(m5.filter(b=>inResearchSession(b.time,p)).map(b=>b.time))};
  },[m1,m5,researchParams,showSessions]);
  const active = replay.result?.levels;
  const activeLevels = showLevels && active ? [active.high && {price:active.high.value,label:'Active HA high',color:'#f59ca8'},active.low && {price:active.low.value,label:'Active HA low',color:'#72ddc5'}].filter(Boolean) as {price:number;label:string;color:string}[] : [];
  const strategyLevels = showSignals && replay.result?.setup.fib ? [{price:replay.result.setup.fib,label:'BT 0.382',color:'#f7cb58'}] : [];
  const haOverlay = useMemo(() => showHAOverlay && m1.length ? calculateHeikinAshi(m5).filter(b=>b.time>=m1[0].time && b.time<=m1[m1.length-1].time) : [],[showHAOverlay,m1,m5]);
  const markers: Marker[]=[];
  if (showTrades && source === 'twelvedata') for (const {trade} of filtered) {
    if (tradeSymbol(trade.symbol ?? trade.pair)!==symbol) continue;
    const exitTime=tradeTimestamp(trade.exit_time ?? trade.exitTime ?? trade.close_time ?? trade.closeTime ?? trade.closedAt), exitPrice=Number(trade.exit_price ?? trade.exitPrice ?? trade.exit); const pnl=trade.pnl ?? trade.profit;
    if (exitTime && Number.isFinite(exitPrice) && exitPrice>0) markers.push({time:exitTime,price:exitPrice,label:`● Exit${pnl!==undefined&&pnl!==null&&pnl!==''&&Number.isFinite(Number(pnl))?` · P/L ${Number(pnl).toFixed(2)}`:''}`,color:'#efc75c'});
  }
  const leaveFocus=()=>{setFocus(null);const url=new URL(window.location.href);url.searchParams.delete('trade');window.history.replaceState(null,'',url);};
  const connect=(e:React.FormEvent)=>{e.preventDefault();try{sessionStorage.setItem('chart-access-token',tokenInput);}catch{}setToken(tokenInput);setTokenInput('');setForceDemo(false);};
  return <main className="chart-workspace"><header className="chart-topbar"><Link className="chart-brand" href="/chart"><span className="brand-mark">◈</span><span>TRADING<span className="brand-muted">BRAIN</span><small>WORKSPACE</small></span></Link><nav aria-label="Main navigation"><Link href="/chart" className="active">Charts</Link><Link href="/tester">Tester</Link><Link href="/dashboard">Monitor</Link><Link href="/brain">Assessment</Link><Link href="/ea">EA</Link></nav><div className="top-meta"><span className="status-dot"/> MT5 OFFLINE <span className="top-divider"/> SCANNING OFF</div></header>
    <div className="workspace-content"><div className="workspace-heading"><div><div className="eyebrow">MARKET WORKSPACE <span>/</span> DUAL TIMEFRAME</div><h1>Chart workspace<span>.</span></h1><p>One market. Two perspectives. Your setup, in focus.</p></div><div className="heading-actions"><button onClick={()=>setSync(!sync)} className={sync?'active-control':''} aria-pressed={sync}>⛓ &nbsp;Sync {sync?'on':'off'}</button><button onClick={()=>setShowTrades(v=>!v)} className={showTrades?'active-control':''} aria-pressed={showTrades}>Show My Trades {showTrades?'on':'off'}</button><button onClick={()=>setSettings(v=>!v)} aria-expanded={settings}>⚙ &nbsp;Settings</button></div></div>
    {settings && <div className="settings-note"><strong>Chart settings</strong><span>Times are UTC. EMA uses the displayed feed's non-Heiken Ashi closes. Provider data, proxy data and demo data are distinct.</span><button onClick={()=>{try{sessionStorage.removeItem('chart-access-token');}catch{}setToken('');setForceDemo(false);}}>Forget access token</button><button onClick={()=>setForceDemo(false)}>Retry automatic feed</button></div>}
    <div className="market-bar"><div className="market-select"><span className="market-icon">◇</span><div><label htmlFor="symbol-select">SYMBOL</label><select id="symbol-select" value={symbol} onChange={e=>{leaveFocus();setSymbol(e.target.value as SymbolCode);}}><option value="XAUUSD">XAUUSD</option><option value="EURUSD">EURUSD</option><option value="BTCUSD">BTCUSD</option></select></div><span className="market-name">{names[symbol]}</span></div><div className="quote-strip"><div><small>BID</small><strong>{format(tick?.bid,symbol)}</strong></div><div><small>ASK</small><strong>{format(tick?.ask,symbol)}</strong></div><div><small>LAST {source==='demo'?'· DEMO':source==='binance'?'· PROXY':''}</small><strong>{format(tick?.last,symbol)}</strong></div><div className="feed-status"><i/>{source==='demo'?'DEMO':source==='binance'?'PROXY · POLLING':streamState.toUpperCase()}<small>{tick?`Observed ${new Date(tick.time*1000).toISOString().replace('T',' ').slice(0,19)} UTC`:'Awaiting quote'}</small></div></div></div>
    <div className={`feed-notice ${source==='demo'?'demo':source==='binance'?'proxy':''}`} role="status"><span>{dataState} {source==='demo'&&'Not for trading.'}</span><span>{source==='demo'?'Simulated data is not a real market quote.':source==='binance'?`${instrument}: proxy market, not spot ${symbol}.`:'HA close is synthetic and may differ from last.'}</span><button className="demo-button" onClick={()=>setForceDemo(true)}>Skip - Use Demo</button></div>
    {!token && <form className="chart-access" onSubmit={connect}><label htmlFor="chart-token">Optional chart access token</label><input id="chart-token" type="password" value={tokenInput} onChange={e=>setTokenInput(e.target.value)} placeholder="If configured on server" minLength={24} required autoComplete="off"/><button type="submit">Connect data</button><span>Optional for demo. Never enter a provider API key here.</span></form>}
    {focus && <div className="focus-note"><span>Selected journal trade {focus.index+1} · {focus.approximate?'Date only — exact time unknown; showing UTC day start.':`Entry time ${new Date(focus.time*1000).toISOString()}`} {source==='demo'?'Vertical highlight only: recorded prices do not match simulated candles.':source==='binance'?'Vertical highlight only: recorded prices are not proxy prices.':''} {m1.length && !m1.some(b=>b.time===Math.floor(focus.time/60)*60) ? 'Selected time is outside available candles.' : ''}</span><button onClick={leaveFocus}>Return to current chart</button></div>}
    <div className="settings-note research-controls"><strong>Research overlays</strong><button onClick={()=>setShowHAOverlay(v=>!v)} aria-pressed={showHAOverlay}>M5 HA on M1 {showHAOverlay?'on':'off'}</button><button onClick={()=>setShowPivots(v=>!v)} aria-pressed={showPivots}>Pivots {showPivots?'on':'off'}</button><button onClick={()=>setShowLevels(v=>!v)} aria-pressed={showLevels}>Active M5 levels {showLevels?'on':'off'}</button><span>{historyStatus} M1: {m1.length}/2,000 · M5: {m5.length}/5,000. Confirmed pivots are drawn on their original bars after confirmation; levels and HA depend on loaded history. These are not trade signals. M5 overlay may include the unfinished candle; replay uses completed bars only.</span></div>
    <div className="timeframe-selector" role="group" aria-label="Chart view"><button onClick={()=>setView('both')} aria-pressed={view==='both'}>Both charts</button><button onClick={()=>setView('M1')} aria-pressed={view==='M1'}>M1 only</button><button onClick={()=>setView('M5')} aria-pressed={view==='M5'}>M5 only</button></div>
    <div className={`chart-grid ${view!=='both'?'chart-grid-single':''}`}>{view!=='M1' && <ChartPane key={`${symbol}-M5-${focus?.index ?? 'now'}`} ref={pane5} source={source} focus={focus} symbol={symbol} timeframe="M5" bars={m5} markers={[...markers,...research.five]} activeLevels={[...activeLevels,...strategyLevels]} sessionTimes={sessionTimes.five} journalMarkers={journalMarkers} onCrosshair={crosshair} onRange={range} onHistory={()=>history('M5')} hasMore={hasMore.M5} loadingMore={loadingMore.M5}/>}{view!=='M5' && <ChartPane key={`${symbol}-M1-${focus?.index ?? 'now'}`} ref={pane1} source={source} focus={focus} symbol={symbol} timeframe="M1" bars={m1} overlayBars={haOverlay} markers={[...markers,...research.one,...eventMarkers]} activeLevels={strategyLevels} sessionTimes={sessionTimes.one} journalMarkers={journalMarkers} onCrosshair={crosshair} onRange={range} onHistory={()=>history('M1')} hasMore={hasMore.M1} loadingMore={loadingMore.M1} onCopy={view==='both'?()=>pane5.current?.addDrawings(pane1.current?.copyDrawings()||[]):undefined}/>}</div>
    <ResearchPanel params={researchParams} onApply={applyResearch} result={replay.result} error={replay.error} m1={m1.filter(b=>b.time+60<=Date.now()/1000)} source={source} showSignals={showSignals} setShowSignals={setShowSignals} showSessions={showSessions} setShowSessions={setShowSessions}/>
    {journal && <p className="trade-marker-note">{filtered.length} filtered journal records · {journalMarkers.length} have a supported symbol, side and exact openedAt for {symbol} · {journalMarkers.filter(m=>m.conflict).length} direction conflicts. Labels are from the journal, not automatically verified patterns. Triangles mark candle time, not execution price. Hover the matching candle for details; click a journal row to jump to older trades. Demo/proxy candles do not represent your trade prices.</p>}
    <JournalTable/><footer className="chart-footer"><span>Simulated and proxy feeds are not suitable for trading decisions. Not financial advice.</span><span>NO MT5 CONNECTION &nbsp;·&nbsp; NO AUTOMATED SCANNING</span></footer></div></main>;
}
