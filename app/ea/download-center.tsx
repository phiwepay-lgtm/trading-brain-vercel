'use client';

import { useState } from 'react';
import { ArrowDownToLine, Copy, FileCode2 } from 'lucide-react';

const sourcePath = '/ea/Dark_Orders_Pure_Price.pine';

export default function DownloadCenter() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function showCode() {
    setLoading(true);
    setCode('');
    setMessage('');
    try {
      const response = await fetch(sourcePath, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load the code. Please try the download instead.');
      const text = await response.text();
      if (!/^\/\/@version=5\r?\nindicator\("Dark Orders Pure Price \+ History \[Blackwatch\]"/.test(text)) {
        throw new Error('The source did not match the expected Pine script. Nothing was copied.');
      }
      setCode(text);
      setMessage('Code loaded. Replace the existing text in TradingView Pine Editor before pasting.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the code. Please try the download instead.');
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setMessage('Copied. Replace the existing text in Pine Editor, paste, save and add to chart.');
    } catch {
      setMessage('Clipboard access was blocked. Select and copy the code below manually.');
    }
  }

  return <section className="feature-card ea-download-card">
    <div className="feature-section-label">01 / TRADINGVIEW INDICATOR</div>
    <div className="feature-card-heading"><div>
      <h2>Dark Orders <span>—</span> Pure Price + History<span>.</span></h2>
      <p>A price-only TradingView overlay highlighting unusual candle expansion, with a recent-signal recap.</p>
    </div><span className="feature-pill">PINE SCRIPT · V5</span></div>
    <div className="ea-platform-guide"><strong>How to read it</strong><p>Orange means both range and body meet their multiplier and 1.5 Z-score thresholds, but there is no directional DARK signal. Lime (DARK+ PURE) or red (DARK− PURE) also requires the Heikin Ashi body to exceed 1.2 times its 20-bar average and the chart candle to close bullish or bearish, respectively. Labels appear below bullish and above bearish bars; other candles keep their chart colors.</p></div>
    <div className="ea-platform-guide"><strong>History recap</strong><p>The optional table shows the latest 20 confirmed DARK+ and DARK− signals by default (adjustable to 1–100), newest first. Times are bar-open times in the symbol’s exchange timezone; prices are bar closes. The bottom counts cover all loaded chart history, not just the displayed rows or a particular day or week. Orange bars are painted on the chart but are not listed or counted.</p></div>
    <div className="ea-file ea-platform-file">
      <span className="ea-file-icon"><FileCode2 size={21} /></span>
      <div><strong>Dark Orders Pure Price + History [Blackwatch]</strong><p>TradingView overlay · 50-bar lookback · 1.8 range and body multipliers · 1.5 Z-score · recent confirmed-signal recap · bullish and bearish alert conditions</p><code>Dark_Orders_Pure_Price.pine</code>
        <div className="ea-source-tools">
          <button type="button" className="ea-code-toggle" onClick={() => void showCode()} disabled={loading}>{loading ? 'Loading code…' : 'Show Dark Orders code'}</button>
          {code && <div className="ea-code-panel"><p>In TradingView, open Pine Editor, replace its contents with this script, then save and add to chart. For the M5 approach, use a 5-minute chart.</p><textarea aria-label="Dark Orders Pine code" value={code} readOnly spellCheck={false} onFocus={event => event.currentTarget.select()} /><button type="button" className="feature-secondary" onClick={() => void copyCode()}><Copy size={14} /> Copy Dark Orders code</button></div>}
          <p className="ea-code-status" role="status">{message}</p>
        </div>
      </div>
      <a className="feature-secondary" href={sourcePath} download>Download Dark Orders <ArrowDownToLine size={15} /></a>
    </div>
    <div className="feature-notice warning"><p><strong>Context, not a trading signal.</strong> Price expansion alone does not identify institutional or dark-pool orders, net buying or selling, or guarantee an entry. The script does not detect the 0.382 level. Heikin Ashi uses the chart timeframe; open-bar colors and conditions can change before close, so use once-per-bar-close alerts for confirmed bars. GC and XAUUSD can differ by feed, session and price history; any lead or timing relationship is unverified. Historical colors and counts depend on loaded data and settings and are recalculated, not permanently saved. The table does not measure trade outcomes or establish why a trade failed. This script has not been compiled or verified in TradingView.</p></div>
  </section>;
}
