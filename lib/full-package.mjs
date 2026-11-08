import { summarize } from './journal-analytics.mjs';
import { packageFiles } from './ea-package.mjs';
import JSZip from 'jszip';

// Only aggregate metrics leave browser storage via the user-initiated ZIP.
export function journalSystem(trades, ratio = null) {
  if (trades !== null && !Array.isArray(trades)) throw new TypeError('Expected journal trades or null');
  if (ratio !== null && (!Number.isFinite(ratio) || ratio < 2 || ratio > 7)) throw new RangeError('R:R must be between 2 and 7');
  const system = JSON.parse(packageFiles(7)['system.json']);
  system.version = '1.1-user-rules';
  system.risk.selected_hypothetical_r = ratio;
  system.risk.note += ratio === null ? ' The Download Center does not read the dashboard slider; no selected ratio is exported.' : ' This is the dashboard slider selection, not a tested optimum.';
  system.filters.session = 'User claims 17:00 New York is best; previously proposed 14:00-16:00 New York.';
  system.filters.note = 'These differing user-provided session claims are not validated. Journal hour timezones are not inferred.';
  system.stats_source = trades === null ? {
    status:'not_uploaded', verified:false, note:'No journal uploaded in this browser; journal-derived statistics unavailable.'
  } : (() => {
    const s=summarize(trades);
    return {
      status:'uploaded_journal', verified:false, trades:s.count,
      total_pnl:s.totalPnl, pnl_records:s.pnlN,
      winrate_full_tp:s.fullTPRate, full_tp_count:s.fullTP, full_tp_denominator:s.count,
      recorded_win_rate_including_be_and_unknown:s.winRate,
      recorded_win_rate_excluding_be_and_unknown:s.decidedWinRate,
      wins:s.wins, losses:s.losses, breakeven:s.be, unknown_outcome:s.unknown,
      avg_R:s.avgR, r_records:s.rN, profit_factor:s.profitFactor,
      missing_status:s.missingStatus, conflicting_records:s.conflicts,
      note:'Descriptive unverified arithmetic from all uploaded records, including inconsistent records; P/L units and journal hour timezones are not verified. Full TP requires an explicit label; recorded wins are separate. Null means unavailable.'
    };
  })();
  system.disclaimers = [
    'Uploaded journal data is unverified, not brokerage performance; no raw records are included.',
    'Demo/Binance proxy prices are not live market execution.',
    'R:R scenarios assume the same Full TP trades reach each target and are not backtest proof.',
    'Pine is a comment-only skeleton; detection, markers, FVG and table are not implemented.',
    'The EA is sample source, disabled by default; if explicitly enabled it can place orders from a valid signal. No EX5 is supplied.',
    'User-provided session and best-setup claims have not been independently verified.'
  ];
  return system;
}

export async function createFullPackage(trades, ratio = null) {
  const names=['TradingBrain.mq5','TradingBrain_GOLD_M1_VLB_VHB.pine','README.txt'];
  const files=await Promise.all(names.map(async name=>{const response=await fetch(`/ea/${name}`);if(!response.ok)throw new Error(`Could not load ${name}.`);return [name,await response.text()];}));
  const zip=new JSZip();for(const [name,content] of files)zip.file(name,content);
  zip.file('system.json',JSON.stringify(journalSystem(trades,ratio),null,2)+'\n');
  return zip.generateAsync({type:'blob'});
}
