'use client';
import { useMemo, useState } from 'react';
import { scenario } from '../../lib/rr-scenario.mjs';
import { createFullPackage } from '../../lib/full-package.mjs';
import { FTB_DEFINITION, VHB_DEFINITION, VLB_DEFINITION } from '../../lib/setup-definitions.mjs';
import type { TradeRecord } from '../../lib/journal';

export default function RiskReward({trades,journalLoaded}:{trades:TradeRecord[];journalLoaded:boolean}) {
  const [ratio,setRatio] = useState(7), [message,setMessage] = useState('');
  const result = useMemo(() => scenario(trades,ratio), [trades,ratio]);
  const target = ratio.toFixed(1);
  const modelResult = result.totalR === null ? 'Unavailable: no eligible explicit outcomes.' : `${result.totalR.toFixed(2)} R from ${result.included} eligible records, assuming fixed outcomes.`;
  const ceiling = result.bestRatio !== null ? '1:7.0 is the mathematical maximum in this fixed-outcome scenario, not a tested optimum.' : result.allRatiosTie ? 'All ratios from 1:2.0 to 1:7.0 tie because there are no explicit Full TPs.' : 'Unavailable: no eligible explicit outcomes.';
  const system = [
    'USER-PROVIDED SYSTEM — MANUAL REVIEW ONLY',
    'M5: Confirm structure.',
    'M1 SELL: VLB (Visual Low Break) — BOS/CHoCH breaks a low, small pullback, then engulfing to a new lower low. Enter on the engulfing candle.',
    'M1 BUY: VHB (Visual High Break) — CHoCH breaks a high, pullback (sometimes none), then engulfing to a new higher high. Enter on the engulfing candle.',
    `${FTB_DEFINITION}.`,
    'SL: User-proposed XAUUSD $3 price distance or ATR; ATR period/multiplier and choice are unspecified and untested. Sell stop above entry / beyond VLB; buy stop below entry. Independently validate before use.',
    `TP: 1:${target} — selected hypothetical target, not a historically tested optimum.`,
    'USER-PROPOSED FILTER: BT 0.382 / FTB 0.382 continuation, GOLD, New York 14:00–16:00. These filters and timezone are not validated by this app.',
    `FIXED-OUTCOME SCENARIO: ${modelResult} ${ceiling}`,
    'Assumes every recorded Full TP still reaches the chosen target, every recorded SL is -1R and every BE is 0R. This is not a backtest and ignores price paths, fees and slippage. Journal data is unverified. No live MT5 or automated scanning.'
  ].join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(system); setMessage('System text copied.'); } catch { setMessage('Copy unavailable. Select the system text and copy it manually.'); } };
  const download = () => { const url = URL.createObjectURL(new Blob([system],{type:'text/plain;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download='trading-system.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('System text downloaded.'); };
  const downloadPackage = async () => { try { const blob=await createFullPackage(journalLoaded ? trades : null,ratio); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='TradingBrain_Full_Package.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Development package downloaded.'); } catch (error) {setMessage(error instanceof Error ? error.message : 'Package download failed. Please try again.');} };
  return <div className="rr-system"><section className="rr-optimizer" aria-label="R:R Optimizer"><div className="rr-heading"><div><div className="journal-kicker">WHAT-IF · FIXED OUTCOMES</div><h3>R:R Optimizer</h3><p>Change the assumed reward for recorded Full TP outcomes across all uploaded records; journal filters do not change this scenario.</p></div><strong>1:{target}</strong></div><label htmlFor="rr-slider">Target reward per 1R risk</label><input id="rr-slider" type="range" min="2" max="7" step="0.1" value={ratio} onChange={e=>setRatio(Number(e.target.value))}/><div className="rr-ends"><span>1:2.0</span><span>1:7.0</span></div><div className="rr-results"><div><small>SCENARIO TOTAL</small><strong>{result.totalR === null ? '—' : `${result.totalR.toFixed(2)} R`}</strong></div><div><small>BREAK-EVEN WIN RATE</small><strong>{result.breakEvenWinRate.toFixed(1)}%</strong><span>Decisive trades, before costs</span></div><div><small>MAX WITH FIXED OUTCOMES</small><strong>{result.bestRatio !== null ? `1:${result.bestRatio.toFixed(1)}` : result.allRatiosTie ? 'All ratios tie' : '—'}</strong></div></div><p className="rr-warning">Hypothetical, not a backtest: assumes the same trades still hit every target. A higher R:R can change which trades win. Costs, slippage and the path to each target are not tested; 1:7 is not an established optimum.</p><p>Included: {result.included}/{result.total} records · Full TP {result.tp} × +{target}R · SL {result.sl} × −1R · BE {result.be} × 0R. Excluded: {result.unclassified} without explicit Full TP/SL/BE and {result.conflictingLabels} with conflicting labels. {result.inconsistentValues} included record(s) have recorded P/L or R signs inconsistent with their labels.</p></section>
    <div className="system-column"><section className="system-export" aria-label="System exporter"><div className="rr-heading"><div><div className="journal-kicker">USER RULES · MANUAL REVIEW</div><h3>System exporter</h3><p>Your clarified VLB/VHB definitions and the selected hypothetical R:R.</p></div></div><textarea aria-label="Generated system text" readOnly value={system} rows={11}/><div className="system-actions"><button onClick={copy}>Copy system</button><button onClick={download}>Download text</button><span aria-live="polite">{message}</span></div><details><summary>Read VLB and VHB definitions</summary><p>{VLB_DEFINITION}</p><p>{VHB_DEFINITION}</p></details></section><div className="package-export"><button onClick={()=>void downloadPackage()}>Download EA Package (ZIP)</button><p>Visual scanner sources only; no executable EA or orders. Candidate markers are unverified heuristics. ZIP includes journal aggregates only, not raw records.</p></div></div></div>;
}
