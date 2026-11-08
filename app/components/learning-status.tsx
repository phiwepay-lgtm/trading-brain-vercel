'use client';
import { useId, useMemo, useState } from 'react';
import { analyze } from '../../lib/journal-analytics.mjs';
import { emptyFilters } from '../../lib/journal-filter.mjs';
import { useJournal } from './journal-store';
import { useJournalFilters, type Filters } from './journal-filters';
import { executionDefinition } from '../../lib/setup-definitions.mjs';
import RiskReward from './risk-reward';
import './journal.css';
const number = (v: number | null) => v === null || !Number.isFinite(v) ? '—' : v.toFixed(2);
const pct = (v: number | null) => v === null ? '—' : `${v.toFixed(1)}%`;
type Row = {label:string;count:number;fullTP:number;fullTPRate:number|null;totalPnl:number|null;avgR:number|null;rN:number;pnlN:number};
type TableProps = {title:string;rows:Row[];all:number;hasR?:boolean;onSelect:(r:Row)=>void};
function Breakdown({title,rows,all,hasR,onSelect}:TableProps) {
  const included = rows.reduce((sum,r)=>sum+r.count,0);
  const [tip,setTip] = useState<{label:string;text:string}|null>(null);
  const tipId=useId();
  return <section className="learning-breakdown" aria-label={title}><div className="learning-table-title"><h3>{title}</h3><span>{included}/{all} records grouped</span></div><div className="learning-scroll"><table><thead><tr><th>GROUP</th><th>COUNT</th><th>FULL TP %</th><th>P/L</th>{hasR && <th>AVG R</th>}</tr></thead><tbody>{rows.map(row=><tr key={row.label} tabIndex={0} onClick={()=>onSelect(row)} onKeyDown={e=>{if(e.target===e.currentTarget && e.key==='Enter') onSelect(row);}}><td><button aria-label={`Filter ${title} ${row.label}`} aria-describedby={tip?.label === row.label ? tipId : undefined} onMouseEnter={()=>{const text=title === 'By execution' && executionDefinition(row.label);if(text)setTip({label:row.label,text});}} onMouseLeave={e=>{if(document.activeElement!==e.currentTarget)setTip(null);}} onFocus={()=>{const text=title === 'By execution' && executionDefinition(row.label);if(text)setTip({label:row.label,text});}} onBlur={()=>setTip(null)}>{row.label}</button></td><td>{row.count}</td><td>{pct(row.fullTPRate)} <small>({row.fullTP}/{row.count})</small></td><td>{number(row.totalPnl)} <small>({row.pnlN}/{row.count})</small></td>{hasR && <td>{number(row.avgR)} <small>({row.rN}/{row.count})</small></td>}</tr>)}{!rows.length && <tr><td colSpan={hasR?5:4}>No recorded groups.</td></tr>}</tbody></table></div>{tip && <div className="execution-tip" role="tooltip" id={tipId}>{tip.text}</div>}</section>;
}
export default function LearningStatus() {
  const {journal}=useJournal(), {update}=useJournalFilters();
  const data=useMemo(()=>analyze(journal?.trades ?? []),[journal]); const s=data.summary;
  const choose=(values:Partial<Filters>)=>{update({...emptyFilters(),...values});document.getElementById('journal')?.scrollIntoView({behavior:'smooth',block:'start'});};
  const continuation=data.bias.find((g:Row)=>g.label.toLowerCase()==='continuation'), reversal=data.bias.find((g:Row)=>g.label.toLowerCase()==='reversal');
  return <section className="journal-learning" aria-label="Brain Learning Status"><div className="learning-head"><div><div className="journal-kicker">JOURNAL INTELLIGENCE · LOCAL ANALYSIS</div><h2>Brain Learning Status<span>.</span></h2><p>{s.count} trades analyzed · User-provided records, not verified performance</p></div><div className="learning-upload">{journal ? `Last upload ${new Date(journal.uploadedAt).toLocaleString()}` : 'No journal uploaded'}</div></div>
    {!journal || !s.count ? <div className="learning-empty"><strong>Upload journal to unlock brain</strong><p>No journal calculations are available yet.</p><a href="#journal">Go to journal upload ↓</a></div> : <>
      <div className="learning-kpis">
        <article><small>TOTAL P/L</small><strong>{number(s.totalPnl)}</strong><p>Total R {number(s.totalR)} R</p><span>P/L {s.pnlN}/{s.count} · R {s.rN}/{s.count} records</span></article>
        <article><small>WIN RATE · FULL TP</small><strong>{pct(s.fullTPRate)}</strong><p>Full TP {s.fullTP}/{s.count} trades</p><span>Recorded BE {pct(s.beRate)} ({s.be}/{s.count}) · Loss {pct(s.lossRate)} ({s.losses}/{s.count})</span></article>
        <article><small>AVERAGE R</small><strong>{number(s.avgR)} R</strong><p>Avg win {number(s.avgWinR)} R · Avg loss {number(s.avgLossR)} R</p><span>All {s.rN}/{s.count} · Wins {s.winRN}/{s.wins} · Losses {s.lossRN}/{s.losses}</span></article>
        <article><small>PROFIT FACTOR</small><strong>{number(s.profitFactor)}</strong><p>Expectancy {number(s.expectancy)} P/L per trade</p><span>Gross profit ÷ absolute gross loss · {s.pnlN}/{s.count} P/L records</span></article>
      </div>
      <div className="learning-method"><p>Based on user-uploaded journal, not live account or verified performance. Monetary values use the journal’s units; currencies are not verified. Expectancy is average recorded P/L.</p><p>Full TP counts explicit “Full TP” statuses/outcomes only, divided by all {s.count} records. Recorded wins: {s.wins}/{s.count} ({pct(s.winRate)}, including BE in denominator); wins excluding BE/unknown: {s.wins}/{s.wins+s.losses} ({pct(s.decidedWinRate)}). Unknown outcome: {s.unknown}; missing status: {s.missingStatus}. The percentages need not sum to 100%.</p>{s.conflicts>0 && <p className="learning-conflict">⚠ {s.conflicts} record{s.conflicts===1?' has':'s have'} inconsistent outcome/status or P/L/R signs. Figures are arithmetic on recorded fields, not verified results.</p>}</div>
      <div className="learning-tables"><Breakdown title="By setup" rows={data.setup} all={s.count} hasR onSelect={r=>choose({entryType:r.label})}/><Breakdown title="By execution" rows={data.exec} all={s.count} onSelect={r=>choose({exec:r.label})}/><Breakdown title="By bias" rows={data.bias} all={s.count} onSelect={r=>choose({bias:r.label})}/><Breakdown title="By session / hour" rows={data.sessionHour} all={s.count} hasR onSelect={r=>{const match=r.label.match(/^(.*) · (\d{2}):00$/); if(match)choose({sess:match[1],hour:String(Number(match[2]))});}}/></div>
      <div className="learning-insights"><h3>Journal observations</h3><ol><li>{data.bestCombo ? `Highest average R setup + execution: ${data.bestCombo.label} · ${data.bestCombo.count} trades · ${pct(data.bestCombo.fullTPRate)} explicit Full TP (${data.bestCombo.fullTP}/${data.bestCombo.count}) · ${number(data.bestCombo.avgR)} average R from ${data.bestCombo.rN} records.` : 'Not enough setup, execution and R data to compare combinations.'}</li><li>{continuation?.avgR != null && reversal?.avgR != null ? `Continuation averages ${number(continuation.avgR)} R (${continuation.rN} records) versus Reversal ${number(reversal.avgR)} R (${reversal.rN} records): difference ${number(continuation.avgR-reversal.avgR)} R.` : 'Not enough Continuation and Reversal R data to compare bias.'}</li><li>{data.bestHour ? `Highest average R recorded hour: ${data.bestHour.label} · ${number(data.bestHour.avgR)} R across ${data.bestHour.rN} records. The source hour’s timezone is unspecified.` : 'Not enough session, hour and R data to compare hours.'}</li></ol><p>Descriptive only; small samples and inconsistent records can distort these observations.</p></div>
    </>}
    <RiskReward trades={journal?.trades ?? []} journalLoaded={!!journal} />
  </section>;
}
