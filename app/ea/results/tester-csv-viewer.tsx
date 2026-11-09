'use client';
import { useRef, useState } from 'react';
import { MAX_ALGO_CSV_BYTES, parseAlgoTesterCSV } from '../../../lib/algo-tester-csv.mjs';
import './tester-csv.css';

type Deal = { time_broker:string; symbol:string; deal_id:string; position_id:string; deal_type:string; entry_type:string; volume:number; price:number; profit:number; commission:number; swap:number; currency:string; reason:string };

export default function TesterCsvViewer() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const requestId = useRef(0);
  async function openFile(file: File) {
    const id = ++requestId.current;
    setDeals([]); setFilename(''); setError('');
    try {
      if(file.size > MAX_ALGO_CSV_BYTES) throw new Error('CSV exceeds 4 MB.');
      const parsed = parseAlgoTesterCSV(await file.text()) as Deal[];
      if(id !== requestId.current) return;
      setDeals(parsed); setFilename(file.name);
    } catch (e) { if(id === requestId.current) setError(e instanceof Error ? e.message : 'Could not read the CSV.'); }
  }
  function clear() { requestId.current++; setDeals([]); setFilename(''); setError(''); }
  const totals = deals.reduce((out, d) => { out.set(d.currency, (out.get(d.currency) ?? 0) + d.profit + d.commission + d.swap); return out; }, new Map<string, number>());
  return <section className="feature-card tester-csv-card">
    <div className="feature-section-label">STRATEGY TESTER / DEAL EVENTS</div>
    <div className="feature-card-heading"><div><h2>Open a CSV<span>.</span></h2><p>Choose an Algo V2 tester deal log. It stays in page memory and is not uploaded or saved to the journal.</p></div></div>
    <div className="feature-notice warning"><p><strong>Simulated deals, not live performance.</strong> Rows are deal events, not complete trades. Partial fills and exits may create multiple rows. Broker times have no timezone offset. The file can be incomplete; verify against the MT5 tester report before interpreting totals.</p></div>
    <div className="tester-csv-actions"><label className="feature-secondary">Choose tester CSV<input type="file" accept=".csv,text/csv" onChange={event => { const file=event.currentTarget.files?.[0]; event.currentTarget.value=''; if(file) void openFile(file); }} /></label>{filename && <button className="feature-secondary" type="button" onClick={clear}>Clear</button>}</div>
    {error && <p className="tester-csv-error" role="alert">{error}</p>}
    {filename && <><p className="tester-csv-summary">{filename} · {deals.length} deal {deals.length === 1 ? "event" : "events"} · showing first {Math.min(deals.length,250)}</p><p className="tester-csv-summary">Recorded profit + commission + swap (all rows, may be incomplete): {Array.from(totals.entries()).map(([currency,value]) => `${currency} ${value.toFixed(4)}`).join(' · ')}</p>
      <div className="tester-csv-scroll"><table><thead><tr><th>Broker time</th><th>Symbol</th><th>Deal ID</th><th>Position ID</th><th>Side</th><th>Event</th><th>Volume</th><th>Price</th><th>Profit</th><th>Commission</th><th>Swap</th><th>Currency</th><th>Reason</th></tr></thead><tbody>{deals.slice(0,250).map(d=><tr key={d.deal_id}><td>{d.time_broker}</td><td>{d.symbol}</td><td>{d.deal_id}</td><td>{d.position_id}</td><td>{d.deal_type.replace('DEAL_TYPE_','')}</td><td>{d.entry_type.replace('DEAL_ENTRY_','')}</td><td>{d.volume}</td><td>{d.price}</td><td>{d.profit}</td><td>{d.commission}</td><td>{d.swap}</td><td>{d.currency}</td><td>{d.reason}</td></tr>)}</tbody></table></div></>}
  </section>;
}
