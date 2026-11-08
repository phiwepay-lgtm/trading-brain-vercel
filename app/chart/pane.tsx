'use client';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ColorType, createChart, CrosshairMode, type IChartApi, type ISeriesApi, type Time, type UTCTimestamp } from 'lightweight-charts';
import { ema, heikinAshi } from '../../lib/chart-math.mjs';
import type { JournalMarker } from '../../lib/journal-markers';
import { markerVisual } from '../../lib/setup-definitions.mjs';

export type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number | null };
type Point = { time: number; price: number };
type Shape = { id: string; kind: string; a: Point; b?: Point; text?: string };
export type Marker = { time: number; price: number; label: string; color: string; shape?: 'above' | 'below' };
type ActiveLevel = {price:number;label:string;color:string};
type PaneHandle = { crosshair: (time: number | null, price: number) => void; range: (range: { from: Time; to: Time }) => void; copyDrawings: () => Shape[]; addDrawings: (drawings: Shape[]) => void; screenshot: () => void };
type Props = { source: string; focus: {time: number; approximate: boolean} | null; symbol: string; timeframe: 'M1' | 'M5'; bars: Bar[]; overlayBars?: Bar[]; markers: Marker[]; activeLevels?: ActiveLevel[]; sessionTimes?: Set<number>; journalMarkers: JournalMarker[]; onCrosshair: (source: string, time: number | null, price: number) => void; onRange: (source: string, range: { from: Time; to: Time }) => void; onHistory: () => void; hasMore: boolean; loadingMore: boolean; onCopy?: () => void };
const tools = [['cursor', '↖', 'Cursor'], ['trend', '╱', 'Trendline'], ['horizontal', '━', 'Horizontal line'], ['fib', '≋', 'Fibonacci'], ['rectangle', '▭', 'Rectangle'], ['text', 'T', 'Text'], ['eraser', '⌫', 'Eraser']];
const colors = { upColor: '#26c7a2', downColor: '#f46d7b', borderUpColor: '#26c7a2', borderDownColor: '#f46d7b', wickUpColor: '#26c7a2', wickDownColor: '#f46d7b' };

const ChartPane = forwardRef<PaneHandle, Props>(function ChartPane({ source, focus, symbol, timeframe, bars, overlayBars, markers, activeLevels = [], sessionTimes, journalMarkers, onCrosshair, onRange, onHistory, hasMore, loadingMore, onCopy }, ref) {
  const host = useRef<HTMLDivElement>(null), overlay = useRef<HTMLCanvasElement>(null);
  const chart = useRef<IChartApi | null>(null), candles = useRef<ISeriesApi<'Candlestick'> | null>(null), line = useRef<ISeriesApi<'Line'> | null>(null), overlayCandles = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const barsRef = useRef(bars), hooks = useRef({ onCrosshair, onRange, onHistory }), skipSync = useRef(false), suppressRange = useRef(false), rangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null), previous = useRef<{ bars: Bar[]; ha: boolean; enabled: boolean } | null>(null);
  const [ha, setHa] = useState(timeframe === 'M5'), [indicator, setIndicator] = useState(true), [tool, setTool] = useState('cursor');
  const [shapes, setShapes] = useState<Shape[]>([]), [anchor, setAnchor] = useState<Point | null>(null), [hover, setHover] = useState<Point | null>(null);
  const [legend, setLegend] = useState('');
  const [tooltip, setTooltip] = useState<{text:string;x:number;y:number}|null>(null);
  const storageKey = `trading-brain-drawings-v1:${symbol}:${timeframe}`;
  const shapesRef = useRef(shapes); shapesRef.current = shapes; barsRef.current = bars; hooks.current = { onCrosshair, onRange, onHistory };
  const seconds = timeframe === 'M5' ? 300 : 60, period = timeframe === 'M5' ? 21 : 9;
  const decimals = symbol === 'EURUSD' ? 5 : 2;
  const plotted = useMemo(() => { const available = new Set(bars.map(b => b.time)); return journalMarkers.map(m => ({...m, barTime:Math.floor(m.time / seconds)*seconds})).filter(m => available.has(m.barTime)).sort((a,b) => a.barTime-b.barTime || a.id.localeCompare(b.id)); }, [journalMarkers,bars,seconds]);
  const display = useMemo(() => ha ? heikinAshi(bars) as Bar[] : bars, [ha,bars]);
  const barsByTime = useMemo(() => new Map(display.map(b=>[b.time,b])),[display]);
  const tooltipTimes = useRef(new Map<number,string[]>()); tooltipTimes.current = new Map(); for (const m of plotted) tooltipTimes.current.set(m.barTime, [...(tooltipTimes.current.get(m.barTime) ?? []),m.tooltip]);

  useEffect(() => { try { const val = JSON.parse(localStorage.getItem(storageKey) || '[]'); setShapes(Array.isArray(val) ? val.filter(x => x && typeof x.kind === 'string' && Number.isFinite(x.a?.time) && Number.isFinite(x.a?.price)).slice(0, 500) : []); } catch { setShapes([]); } }, [storageKey]);
  const save = useCallback((next: Shape[]) => { setShapes(next); try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {} }, [storageKey]);

  const draw = useCallback(() => {
    const canvas = overlay.current, api = chart.current, series = candles.current;
    if (!canvas || !api || !series) return;
    const width = canvas.clientWidth, height = canvas.clientHeight, dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
    const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const xy = (p: Point) => { const x = api.timeScale().timeToCoordinate((Math.floor(p.time / seconds) * seconds) as UTCTimestamp), y = series.priceToCoordinate(p.price); return x === null || y === null ? null : { x, y }; };
    if (sessionTimes?.size) {
      const visible=api.timeScale().getVisibleRange(), from=typeof visible?.from==='number'?visible.from:-Infinity, to=typeof visible?.to==='number'?visible.to:Infinity;
      ctx.fillStyle='rgba(55, 164, 156, 0.10)'; const spacing=api.timeScale().options().barSpacing;
      for (const b of bars) if (b.time>=from && b.time<=to && sessionTimes.has(b.time)) {const x=api.timeScale().timeToCoordinate(b.time as UTCTimestamp);if(x!==null)ctx.fillRect(x-spacing/2,0,spacing,height-25);}
    }
    ctx.lineWidth = 1.4; ctx.font = '11px Inter, system-ui, sans-serif';
    for (const shape of [...shapes, ...(anchor && hover ? [{ id: 'preview', kind: tool, a: anchor, b: hover }] : [])]) {
      const a = shape.kind === 'horizontal' ? { x: 0, y: series.priceToCoordinate(shape.a.price) } : xy(shape.a), b = shape.b && xy(shape.b); if (!a || a.y === null) continue;
      ctx.strokeStyle = '#9faeff'; ctx.fillStyle = '#c3ccff'; ctx.setLineDash([]); ctx.beginPath();
      if (shape.kind === 'horizontal') { ctx.moveTo(0, a.y); ctx.lineTo(width - 65, a.y); ctx.stroke(); }
      else if (shape.kind === 'text') { ctx.fillText(shape.text || 'Note', a.x + 4, a.y - 4); }
      else if (b && shape.kind === 'trend') { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      else if (b && shape.kind === 'rectangle') { ctx.fillStyle = 'rgba(133,151,255,.10)'; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); }
      else if (b && shape.kind === 'fib') { [0, .236, .382, .5, .618, 1].forEach(level => { const y = a.y + (b.y - a.y) * level; ctx.beginPath(); ctx.moveTo(a.x, y); ctx.lineTo(b.x, y); ctx.stroke(); ctx.fillText(`${(level * 100).toFixed(level === .236 || level === .382 || level === .618 ? 1 : 0)}%`, Math.min(a.x, b.x) + 3, y - 3); }); }
    }
    // Triangle positions use the displayed candle's high/low, not a recorded execution price.
    const stacked = new Map<string,number>();
    for (const m of plotted) {
      const bar = barsByTime.get(m.barTime); if (!bar) continue;
      const visual = markerVisual(m), p = xy({time:m.barTime, price:visual.position === 'belowBar' ? bar.low : bar.high});
      if (!p || p.x < 0 || p.x > width - 60) continue;
      const stackKey = `${m.barTime}:${m.side}`, offset = stacked.get(stackKey) ?? 0; stacked.set(stackKey,offset+1);
      const up = visual.shape === 'triangleUp', y = p.y + (up ? 10 + offset*18 : -10 - offset*18);
      ctx.fillStyle=visual.color; ctx.beginPath();
      ctx.moveTo(p.x,y); ctx.lineTo(p.x-6,y+(up?10:-10)); ctx.lineTo(p.x+6,y+(up?10:-10)); ctx.closePath(); ctx.fill();
      ctx.font='10px Inter, system-ui, sans-serif'; ctx.fillStyle='#cbd5e1'; ctx.fillText(m.label,p.x+9,y+(up?10:-3));
    }
    if (focus) { const x = api.timeScale().timeToCoordinate((Math.floor(focus.time / seconds) * seconds) as UTCTimestamp); if (x !== null) { ctx.strokeStyle = '#ffd36f'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height - 25); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#ffd36f'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.fillText(focus.approximate ? 'Journal date · time unknown' : 'Selected journal trade', Math.max(4, Math.min(x + 5, width - 165)), 42); } }
    for (const level of activeLevels) { const y=series.priceToCoordinate(level.price); if (y === null) continue; ctx.strokeStyle=level.color;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width-65,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=level.color;ctx.font='10px Inter, system-ui, sans-serif';ctx.fillText(level.label,8,y-4); }
    for (const mark of markers) { const p = xy(mark); if (!p || p.x<0 || p.x>width-60) continue; ctx.fillStyle = mark.color; ctx.font = 'bold 10px Inter, system-ui, sans-serif'; ctx.beginPath(); if (mark.shape) { const d=mark.shape==='above'?-1:1, y=p.y+d*6;ctx.moveTo(p.x,y);ctx.lineTo(p.x-4,y+d*7);ctx.lineTo(p.x+4,y+d*7);ctx.closePath();ctx.fill();ctx.fillText(mark.label,p.x+6,y+d*8); } else {ctx.fillText(mark.label,p.x+4,p.y-6);ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();} }
  }, [shapes, anchor, hover, tool, markers, activeLevels, sessionTimes, bars, seconds, focus, plotted, barsByTime]);
  const drawRef = useRef(draw); drawRef.current = draw;

  useEffect(() => {
    if (!host.current) return;
    const api = createChart(host.current, { autoSize: true, layout: { background: { type: ColorType.Solid, color: '#101722' }, textColor: '#94a3b8', fontFamily: 'Inter, system-ui, sans-serif' }, grid: { vertLines: { color: '#1c2837' }, horzLines: { color: '#1c2837' } }, crosshair: { mode: CrosshairMode.Normal }, rightPriceScale: { borderColor: '#29394b' }, timeScale: { borderColor: '#29394b', timeVisible: true, secondsVisible: false }, localization: { locale: 'en-US' } });
    const series = api.addCandlestickSeries({ ...colors, priceFormat: { type: 'price', precision: decimals, minMove: Math.pow(10, -decimals) }, lastValueVisible: true });
    const emaLine = api.addLineSeries({ color: timeframe === 'M5' ? '#5595ff' : '#f7cb58', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, priceFormat: { type: 'price', precision: decimals, minMove: Math.pow(10, -decimals) } });
    const overlaySeries = timeframe === 'M1' ? api.addCandlestickSeries({upColor:'rgba(38,199,162,0.30)',downColor:'rgba(244,109,123,0.30)',borderUpColor:'rgba(38,199,162,0.45)',borderDownColor:'rgba(244,109,123,0.45)',wickUpColor:'rgba(38,199,162,0.45)',wickDownColor:'rgba(244,109,123,0.45)',lastValueVisible:false,priceLineVisible:false}) : null;
    chart.current = api; candles.current = series; line.current = emaLine; overlayCandles.current = overlaySeries;
    api.subscribeCrosshairMove(param => {
      const atTime = typeof param.time === 'number' ? tooltipTimes.current.get(param.time) : undefined;
      const description = (atTime?.length ? atTime.slice(0,3).join(' • ') + (atTime.length > 3 ? ` • +${atTime.length - 3} more; see marker list` : '') : undefined);
      setTooltip(description && param.point ? {text:description,x:param.point.x,y:param.point.y} : null);
      const b = param.seriesData.get(series) as { open?: number; high?: number; low?: number; close?: number } | undefined;
      const e = param.seriesData.get(emaLine) as { value?: number } | undefined;
      if (b?.open !== undefined) setLegend(`O ${b.open.toFixed(decimals)}  H ${b.high!.toFixed(decimals)}  L ${b.low!.toFixed(decimals)}  C ${b.close!.toFixed(decimals)}${e?.value !== undefined ? `  EMA ${e.value.toFixed(decimals)}` : ''}`);
      else setLegend('');
      if (skipSync.current) return;
      const price = param.point ? series.coordinateToPrice(param.point.y) : null;
      hooks.current.onCrosshair(timeframe, typeof param.time === 'number' ? param.time : null, price ?? 0);
    });
    api.timeScale().subscribeVisibleTimeRangeChange(range => { drawRef.current(); if (!skipSync.current && !suppressRange.current && range) hooks.current.onRange(timeframe, range); });
    api.timeScale().subscribeVisibleLogicalRangeChange(range => { if (range && range.from < 40) hooks.current.onHistory(); drawRef.current(); });
    const redraw = () => requestAnimationFrame(() => drawRef.current());
    const el = host.current; el.addEventListener('pointermove', redraw); el.addEventListener('wheel', redraw); const resize = new ResizeObserver(redraw); resize.observe(el);
    return () => { el.removeEventListener('pointermove', redraw); el.removeEventListener('wheel', redraw); resize.disconnect(); if (rangeTimer.current) clearTimeout(rangeTimer.current); chart.current = null; candles.current = null; line.current = null; overlayCandles.current = null; api.remove(); };
  }, [timeframe, decimals]);

  useEffect(() => { overlayCandles.current?.setData((overlayBars ?? []) as any); },[overlayBars]);

  useEffect(() => {
    const api = chart.current, c = candles.current, l = line.current; if (!api || !c || !l) return;
    const values = ema(bars, period);
    const prev = previous.current;
    // Incremental updates preserve the viewport on each tick. A changed prefix requires a full reset.
    const incremental = prev && prev.ha === ha && prev.enabled === indicator && bars.length >= prev.bars.length && bars.length <= prev.bars.length + 1 && bars.length > 0 && prev.bars.length > 0 && bars[0] === prev.bars[0] && (prev.bars.length < 2 || bars[prev.bars.length - 2] === prev.bars[prev.bars.length - 2]);
    if (incremental) { c.update(display[display.length - 1] as any); if (indicator && values.length) l.update(values[values.length - 1] as any); }
    else { c.setData(display as any); l.setData(indicator ? values as any : []); if ((!prev || !prev.bars.length) && bars.length) { const selected = focus ? bars.findIndex(b => b.time === Math.floor(focus.time / seconds) * seconds) : -1; api.timeScale().setVisibleLogicalRange(selected >= 0 ? {from: Math.max(0, selected - 60), to: Math.min(bars.length + 5, selected + 60)} : { from: Math.max(0, bars.length - 120), to: bars.length + 5 }); } }
    previous.current = { bars, ha, enabled: indicator }; requestAnimationFrame(() => drawRef.current());
  }, [bars, display, ha, indicator, period]);
  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { setTooltip(null); }, [plotted]);

  useImperativeHandle(ref, () => ({
    crosshair(time, price) { const api = chart.current, c = candles.current; if (!api || !c) return; skipSync.current = true; if (time === null) api.clearCrosshairPosition(); else { const bucket = Math.floor(time / seconds) * seconds; if (barsRef.current.some(b => b.time === bucket)) api.setCrosshairPosition(price, bucket as UTCTimestamp, c); else api.clearCrosshairPosition(); } skipSync.current = false; },
    range(range) { if (!chart.current) return; suppressRange.current = true; if (rangeTimer.current) clearTimeout(rangeTimer.current); try { chart.current.timeScale().setVisibleRange(range); } catch {} rangeTimer.current = setTimeout(() => { suppressRange.current = false; }, 150); },
    copyDrawings() { return shapesRef.current; },
    addDrawings(incoming) { save([...shapesRef.current, ...incoming.map(s => ({ ...s, id: crypto.randomUUID() }))].slice(-500)); },
    screenshot() { const image = chart.current?.takeScreenshot(), layer = overlay.current; if (!image || !layer) return; const ctx = image.getContext('2d'); ctx?.drawImage(layer, 0, 0, image.width, image.height); const link = document.createElement('a'); link.download = `${symbol}-${timeframe}.png`; link.href = image.toDataURL('image/png'); link.click(); },
  }), [save, seconds, symbol, timeframe]);

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const rect = event.currentTarget.getBoundingClientRect(), api = chart.current, c = candles.current; if (!api || !c) return null;
    const time = api.timeScale().coordinateToTime(event.clientX - rect.left), price = c.coordinateToPrice(event.clientY - rect.top);
    return typeof time === 'number' && price !== null ? { time, price } : null;
  };
  const pick = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointAt(event); if (!p) return;
    if (tool === 'eraser') {
      const api = chart.current!, c = candles.current!, rect = event.currentTarget.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
      const distance = (s: Shape) => { const sx = api.timeScale().timeToCoordinate((Math.floor(s.a.time / seconds) * seconds) as UTCTimestamp), sy = c.priceToCoordinate(s.a.price); if (sy === null) return Infinity; if (s.kind === 'horizontal') return Math.abs(sy - y); if (sx === null) return Infinity; const ex = s.b && api.timeScale().timeToCoordinate((Math.floor(s.b.time / seconds) * seconds) as UTCTimestamp), ey = s.b && c.priceToCoordinate(s.b.price); if (ex == null || ey == null) return Math.hypot(x - sx, y - sy); const dx = ex - sx, dy = ey - sy, t = Math.max(0, Math.min(1, ((x - sx) * dx + (y - sy) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - sx - t * dx, y - sy - t * dy); };
      const nearest = [...shapes].reverse().find(s => distance(s) < 12); if (nearest) save(shapes.filter(s => s.id !== nearest.id)); return;
    }
    if (tool === 'horizontal' || tool === 'text') { const text = tool === 'text' ? window.prompt('Drawing text (kept in this browser):')?.trim().slice(0, 100) : undefined; if (tool === 'text' && !text) return; save([...shapes, { id: crypto.randomUUID(), kind: tool, a: p, text }]); return; }
    if (!anchor) { setAnchor(p); return; }
    save([...shapes, { id: crypto.randomUUID(), kind: tool, a: anchor, b: p }]); setAnchor(null); setHover(null);
  };
  return <section className="chart-pane" aria-label={`${timeframe} chart`}>
    <div className="pane-head"><div><div className="pane-title">{timeframe} <span>—</span> {ha ? 'Heiken Ashi' : 'Candles'} <span>—</span> {indicator ? `${period} EMA` : 'EMA off'}</div><div className="pane-sub">{symbol} <span>·</span> {ha ? 'Heiken Ashi candles' : source === 'demo' ? 'Simulated OHLC' : source === 'binance' ? 'Proxy OHLC' : 'Provider OHLC'} <span>·</span> {legend || 'Hover for OHLC & EMA'}</div></div><div className="pane-controls"><button onClick={() => setHa(v => !v)} title="Switch candle type">{ha ? 'HA' : 'OHLC'} ▾</button><button onClick={() => setIndicator(v => !v)} aria-pressed={indicator}>EMA {indicator ? 'on' : 'off'}</button><button onClick={() => ref && typeof ref !== 'function' && ref.current?.screenshot()} title="Download screenshot">↓</button></div></div>
    <div className="pane-body"><div className="draw-toolbar" aria-label={`${timeframe} drawing tools`}>{tools.map(([key, icon, title]) => <button key={key} title={title} aria-label={`${timeframe} ${title}`} aria-pressed={tool === key} onClick={() => { setTool(key); setAnchor(null); setHover(null); }}>{icon}</button>)}{onCopy && <button title="Copy drawings to M5" aria-label="Copy M1 drawings to M5" onClick={onCopy}>⇥</button>}</div><div className="chart-area"><div className="chart-host" ref={host} />{source === 'demo' && <div className="demo-watermark">DEMO · SIMULATED</div>}{source === 'binance' && <div className="demo-watermark proxy-watermark">{symbol === 'XAUUSD' ? 'PAXG/USDT PROXY' : 'BTC/USDT PROXY'}</div>}{tooltip && <div className="marker-tooltip" role="tooltip" style={{left:Math.max(4,Math.min(tooltip.x+12,(host.current?.clientWidth ?? 300)-240)),top:Math.max(4,tooltip.y-45)}}>{tooltip.text}</div>}<canvas className="drawing-layer" ref={overlay} style={{ pointerEvents: tool === 'cursor' ? 'none' : 'auto', cursor: tool === 'eraser' ? 'not-allowed' : 'crosshair' }} onPointerDown={pick} onPointerMove={e => { if (anchor) setHover(pointAt(e)); }} />{!bars.length && <div className="chart-empty">No market data to display</div>}<button className="history-button" disabled={!hasMore || loadingMore || !bars.length} onClick={onHistory}>{loadingMore ? 'Loading…' : hasMore ? '← Earlier candles' : 'No earlier data'}</button></div></div>
    <div className="pane-foot"><span>{tool === 'cursor' ? 'Scroll to zoom · drag to pan' : `${tools.find(t => t[0] === tool)?.[2]} selected · ${anchor ? 'choose second point' : 'click chart'}`}</span><details className="marker-list"><summary aria-label={`${timeframe} trade markers`}>{plotted.length} trade markers in loaded candles</summary>{plotted.length > 0 && <ul>{plotted.map(m=><li key={m.id}>{new Date(m.time*1000).toISOString()} · {m.side} · {m.tooltip}</li>)}</ul>}</details><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Charts by TradingView</a></div>
  </section>;
});
export default ChartPane;
export type { PaneHandle, Shape };
