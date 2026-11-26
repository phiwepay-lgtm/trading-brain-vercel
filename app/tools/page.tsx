import Link from 'next/link';

const curlExample = `curl -s -X POST https://your-site.app/api/trade \\
  -H 'Content-Type: application/json' \\
  -d '{"symbol":"EURUSD","direction":"long","entry":1.09456,"stop":1.09356,"balance":50000,"riskPercent":1,"pipValuePerLot":10}'`;

const responseExample = `{"status":"ok","symbol":"EURUSD","direction":"long","entry":1.09456,"stop":1.09356,"lot":5.000000000000551,"pipsAtRisk":9.999999999998899,"riskUSD":500}`;

export default function ToolsPage() {
  return <main className="page">
    <header><Link className="brand" href="/">TRADING BRAIN <span>/</span> DARK ORDERS</Link><span className="tag">TOOLS</span></header>
    <section className="intro">
      <p className="eyebrow">MY TRADING TOOLS</p>
      <h1>Tools<span>.</span></h1>
      <p>Automation for getting alerts straight to MT5 without typing anything into MetaTrader: a risk-based trade webhook and a local MT5 sender bridge.</p>
    </section>

    <section className="card">
      <div className="card-heading">
        <div><p className="eyebrow">TRADE WEBHOOK</p><h2>Trade webhook</h2><p>POST /api/trade — chart alert to a concrete plan.</p></div>
        <span className="tag">.JSON</span>
      </div>
      <div className="details"><h3>What it does</h3><p>Accepts a chart alert and returns a concrete trade plan — symbol, direction, entry, stop and a lot size computed from your account risk settings. Nothing is entered manually on MT5.</p></div>
      <div className="details"><h3>Alert fields (all required)</h3><ul>
        <li><code>symbol</code> — e.g. <code>EURUSD</code></li>
        <li><code>direction</code> — <code>long</code> or <code>short</code></li>
        <li><code>entry</code> — the alert entry price</li>
        <li><code>stop</code> — stop price; below the entry for long, above it for short</li>
        <li><code>balance</code> — account balance in the account currency</li>
        <li><code>riskPercent</code> — fraction risked per trade (1 means 1%)</li>
        <li><code>pipValuePerLot</code> — dollar value of one pip of one standard lot</li>
      </ul>
      <p>Optional: <code>digits</code> (default 5, e.g. 3 for USDJPY), <code>minLot</code>, <code>maxLot</code>, <code>lotStep</code> (e.g. <code>0.01</code>).</p></div>
      <div className="code-block" aria-label="Example request"><pre>{curlExample}</pre></div>
      <div className="details"><h3>Example response</h3><pre className="code-block">{responseExample}</pre></div>
      <div className="details"><h3>Optional: shared secret</h3><p>Set <code>TRADE_WEBHOOK_SECRET</code> in the environment and send it as the <code>x-trade-secret</code> header to require authentication. Point your TradingView alert webhook URL at the route and set <code>MT5_BRIDGE_URL</code> to forward every plan to a local bridge.</p></div>
    </section>

    <section className="card">
      <div className="card-heading">
        <div><p className="eyebrow">LOCAL MT5 SENDER</p><h2>Local MT5 sender bridge</h2><p>scripts/mt5_sender.py — executes plans on the terminal.</p></div>
        <span className="tag">.PY · MT5</span>
      </div>
      <div className="details"><h3>What it does</h3><p>Receives a plan and executes it with <code>mt5.order_send</code> on the running MetaTrader 5 terminal — entry, stop and the computed lot go out to the broker. If the plan omits <code>lot</code> but has <code>riskPercent</code>, it reads the live balance with <code>mt5.account_info()</code> and computes the lot, mirroring the webhook sizing.</p></div>
      <div className="details"><h3>Setup</h3><ol>
        <li>On the machine running the bridge: <code>pip install MetaTrader5</code>.</li>
        <li>Set <code>MT5_LOGIN</code>, <code>MT5_PASSWORD</code>, <code>MT5_SERVER</code> so <code>mt5.initialize()</code> can connect, or leave them set to the terminal's last login.</li>
        <li>Start the bridge where the terminal is reachable: <code>python3 scripts/mt5_sender.py --host 0.0.0.0 --port 8123</code> (default <code>127.0.0.1:8123</code>, or <code>MT5_BRIDGE_HOST</code>/<code>MT5_BRIDGE_PORT</code>).</li>
        <li>Set <code>MT5_BRIDGE_URL=http://&lt;bridge-host&gt;:8123</code> on the route and deploy or restart it.</li>
      </ol>
      <p>The bridge returns JSON per POST: <code>ok</code>, <code>retcode</code>, <code>retcode_description</code>, <code>ticket</code>, <code>volume</code>, <code>price</code>, <code>sl</code>, <code>tp</code>, <code>symbol</code>, <code>direction</code>, <code>lot</code>. It checks symbol volume min/max/step and refuses a lot outside range or off the step, like the MQL research EA. Python checks: <code>python3 scripts/mt5_sender_test.py</code> (24 checks, no terminal needed).</p></div>
    </section>

    <section className="card">
      <div className="card-heading">
        <div><p className="eyebrow">RISK SIZING</p><h2>Risk sizing engine</h2><p>lib/trade.ts — the plan behind the webhook.</p></div>
        <span className="tag">.TS</span>
      </div>
      <div className="details"><h3>The formula</h3><p><code>riskUSD = balance × riskPercent ÷ 100</code>, then <code>lot = riskUSD ÷ (pipsAtRisk × pipValuePerLot)</code>, floored to the lot step (e.g. 0.01). The stop distance comes from the alert's entry and stop price (<code>stopPipsFor</code>), and the lot is clamped to any min/max you supply.</p></div>
      <div className="details"><h3>Exports</h3><p><code>calculateLotSize</code> · <code>stopPipsFor</code> · <code>pipSizeForDigits</code> (5 digits = 0.0001) · <code>computeTradePlan</code> — covered by the <code>test/trade-sizing.test.js</code> checks in <code>npm test</code>.</p></div>
      <div className="details"><h3>Links</h3><p><Link className="brand" href="/indicators">All indicators</Link></p></div>
    </section>

    <footer>TRADING BRAIN / TOOLS <span>NOT FINANCIAL ADVICE</span></footer>
  </main>;
}
