'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Clock3, FileImage, LoaderCircle, LockKeyhole, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';

type Assessment = { pattern: string; bias: string; entry: number | null; sl: number | null; tp: number | null; rr: number | null; confidence: number | null; verdict: 'TAKE' | 'SKIP'; notes: string };
type HistoryEntry = { id: string; name: string; date: string; thumbnail: string; result: Assessment };
const STORAGE_KEY = 'trading-brain-assessments-v1';
const MAX_SIZE = 3 * 1024 * 1024;
const MAX_FILES = 5;

async function thumbnail(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 320 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to make thumbnail');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .68);
  } finally { URL.revokeObjectURL(url); }
}
function number(value: number | null) { return typeof value === 'number' && Number.isFinite(value) ? String(value) : '—'; }

export default function BrainAssessment() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [token, setToken] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('Choose up to five chart images to get started.');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(saved)) setHistory(saved.slice(0, 10)); } catch { setMessage('Saved history could not be read.'); }
  }, []);
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  function save(next: HistoryEntry[]) {
    setHistory(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return true; }
    catch { setMessage('Result shown, but browser storage is full or unavailable.'); return false; }
  }
  function addFiles(incoming: File[]) {
    if (busy) return;
    const valid = incoming.filter(file => ['image/png', 'image/jpeg'].includes(file.type) && file.size > 0 && file.size <= MAX_SIZE);
    setFiles(previous => [...previous, ...valid].slice(0, MAX_FILES));
    setMessage(valid.length !== incoming.length ? 'Some files were skipped. Use PNG or JPG, up to 3 MB each.' : `Added ${valid.length} image${valid.length === 1 ? '' : 's'}; maximum ${MAX_FILES}.`);
  }
  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }
  async function analyze() {
    if (!files.length || !token.trim() || !consent) { setMessage('Choose an image, enter the access token and confirm the privacy notice.'); return; }
    setBusy(true);
    let next = [...history], completed = 0, storageFailed = false;
    const failures: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setMessage(`Analyzing ${i + 1} of ${files.length}: ${file.name}`);
      try {
        const form = new FormData(); form.append('image', file);
        const response = await fetch('/api/brain/analyze', { method: 'POST', headers: { Authorization: `Bearer ${token.trim()}` }, body: form, signal: AbortSignal.timeout(55000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        const item: HistoryEntry = { id: crypto.randomUUID(), name: file.name.slice(0, 120), date: new Date().toISOString(), thumbnail: await thumbnail(file), result: data };
        next = [item, ...next].slice(0, 10); storageFailed = !save(next) || storageFailed; setSelected(item); completed++;
      } catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : 'Analysis failed.'}`); }
    }
    setMessage(`${completed} of ${files.length} images assessed.${storageFailed ? ' Browser history could not be saved.' : ''}${failures.length ? ` ${failures.join(' ')}` : ' Review all results in history below.'}`);
    setBusy(false);
  }
  function deleteHistory(id: string) { const next = history.filter(item => item.id !== id); if (save(next)) setMessage('Assessment removed from this browser.'); if (selected?.id === id) setSelected(null); }
  function clearHistory() { if (save([])) setMessage('Local assessment history cleared.'); setSelected(null); }
  const result = selected?.result;
  return <div className="feature-page"><header className="feature-topbar"><a href="/dashboard" className="feature-back"><ArrowLeft size={15} /> BACK TO DASHBOARD</a><span>TRADING BRAIN <i>/</i> CHART ASSESSMENT</span><a href="/ea">EA DOWNLOADS <ArrowRight size={13} /></a></header>
    <main className="feature-content"><div className="feature-heading"><div><div className="feature-eyebrow"><span /> THE TRADING BRAIN / VISION</div><h1>See the setup <em>clearly.</em></h1><p>Bring your charts. Get a structured, rules-based assessment for manual review.</p></div><div className="feature-head-badge"><Sparkles size={17} /><div><strong>CHART ASSESSMENT</strong><small>Powered by vision AI</small></div></div></div>
      <div className="feature-notice"><LockKeyhole size={17} /><p><strong>Your charts, your choice.</strong> Images are sent to the configured OpenAI vision provider for analysis. Thumbnails and results are stored in this browser only; avoid shared devices. No images are saved to this repository.</p></div>
      <div className="brain-grid"><section className="feature-card upload-card"><div className="feature-section-label">01 / UPLOAD</div><div className="feature-card-heading"><div><h2>Analyze a setup<span>.</span></h2><p>Add clear screenshots with timeframe and price levels visible.</p></div><span className="feature-pill">PNG / JPG</span></div>
        <div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}><span className="drop-icon"><UploadCloud size={23} /></span><strong>Drop your chart images here</strong><p>Up to 5 images · PNG or JPG · 3 MB each</p><label htmlFor="chart-files" className="choose-button">Choose images <ArrowRight size={14} /></label><input ref={input} id="chart-files" type="file" accept="image/png,image/jpeg" multiple className="sr-only" disabled={busy} onChange={event => { addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} /></div>
        {files.length > 0 && <div className="selected-files">{files.map((file, index) => <div className="file-row" key={`${file.name}-${index}`}><img src={previews[index]} alt="" /><div><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(0)} KB</span></div><button type="button" disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => { setFiles(files.filter((_, i) => i !== index)); setMessage('Image removed from the upload.'); }}><X size={16} /></button></div>)}</div>}
        <div className="token-field"><label htmlFor="access-token">ASSESSMENT ACCESS TOKEN</label><input id="access-token" type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} placeholder="Enter your access token" /><p>Configured as BRAIN_ACCESS_TOKEN in Vercel. Kept in memory only.</p></div>
        <label className="consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I understand these images will be sent to OpenAI and results saved in this browser.</span></label>
        <button className="feature-primary analyze-button" type="button" onClick={() => void analyze()} disabled={busy} aria-busy={busy}>{busy ? <LoaderCircle className="feature-spin" size={16} /> : <Sparkles size={16} />}{busy ? 'Analyzing…' : 'Analyze setup'} <ArrowRight size={15} /></button><div className="feature-feedback" role="status" aria-live="polite"><CheckCircle2 size={13} /> {message}</div>
        <div className="feature-footnote">AI output is fallible and confidence is not calibrated. It is not a trading signal or financial advice.</div></section>
        <section className="feature-card result-card"><div className="feature-section-label">02 / ASSESSMENT</div><div className="feature-card-heading"><div><h2>The readout<span>.</span></h2><p>A structured view of what is visible on your chart.</p></div><span className="result-icon"><Sparkles size={17} /></span></div>
          {result && selected ? <><div className="result-image"><img src={selected.thumbnail} alt={`Chart thumbnail for ${selected.name}`} /><div><strong>{selected.name}</strong><span>{new Date(selected.date).toLocaleString()}</span></div><span className={`verdict ${result.verdict === 'TAKE' ? 'take' : 'skip'}`}>{result.verdict}</span></div><div className="verdict-explain">{result.verdict === 'TAKE' ? 'Visual match for manual review only — not an order.' : 'Insufficient evidence or rules not met — review before acting.'}</div><div className="assessment-grid"><div><span>PATTERN</span><strong>{result.pattern}</strong></div><div><span>BIAS</span><strong>{result.bias}</strong></div><div><span>ENTRY</span><strong>{number(result.entry)}</strong></div><div><span>STOP LOSS</span><strong>{number(result.sl)}</strong></div><div><span>TAKE PROFIT</span><strong>{number(result.tp)}</strong></div><div><span>RISK / REWARD</span><strong>{result.rr === null ? '—' : `1 : ${number(result.rr)}`}</strong></div></div><div className="confidence"><div><span>MODEL CONFIDENCE <small>UNCALIBRATED</small></span><strong>{result.confidence === null ? '—' : `${number(result.confidence)}%`}</strong></div><div className="confidence-track"><i style={{ width: `${Math.max(0, Math.min(100, result.confidence || 0))}%` }} /></div></div><div className="result-notes"><span>ASSESSMENT NOTES</span><p>{result.notes}</p></div></> : <div className="result-empty"><span><FileImage size={26} /></span><h3>Your analysis will appear here.</h3><p>Upload a chart and run an assessment to see the readout.</p><small>NO CHART SELECTED</small></div>}
        </section></div>
      <section className="feature-card history-card"><div className="history-heading"><div><div className="feature-section-label">03 / SAVED LOCALLY</div><h2>Recent assessments<span>.</span></h2><p>Last 10 results on this browser. Select one to view.</p></div><button type="button" className="feature-secondary" onClick={clearHistory} disabled={busy || !history.length}><Trash2 size={14} /> Clear history</button></div>{history.length ? <div className="history-list">{history.map(item => <div className="history-item" key={item.id}><button type="button" className="history-select" onClick={() => { setSelected(item); setMessage(`Showing assessment for ${item.name}.`); }}><img src={item.thumbnail} alt="" /><span><strong>{item.name}</strong><small><Clock3 size={11} /> {new Date(item.date).toLocaleString()}</small></span><span className={`verdict ${item.result.verdict === 'TAKE' ? 'take' : 'skip'}`}>{item.result.verdict}</span></button><button type="button" className="history-delete" aria-label={`Delete ${item.name}`} onClick={() => deleteHistory(item.id)}><Trash2 size={15} /></button></div>)}</div> : <div className="history-empty"><CircleAlert size={16} /> No saved assessments yet.</div>}</section>
      <footer className="feature-footer"><span>✳ &nbsp; TRADING BRAIN / YOUR SYSTEM. YOUR EDGE.</span><span>FOR MANUAL REVIEW ONLY</span></footer>
    </main></div>;
}
