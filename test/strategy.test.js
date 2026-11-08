const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path='reference/legacy-ea/TradingBrain_Strategy.pine';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

test('PR11 indicator and EA implementation are preserved',()=>{
  assert.equal(sha(fs.readFileSync('reference/legacy-ea/TradingBrain_GOLD_M1_VLB_VHB.pine')),'d5ce486da434af5c59fd4e9b313ce15de802b82112231b39510a4f4217140cf4');
  const ea=fs.readFileSync('reference/legacy-ea/TradingBrain.mq5','utf8');
  assert.match(ea,/^\/\/ TODO PR13: WebRequest bridge/);
  assert.equal(sha(ea.slice(ea.indexOf('\n')+1)),'9c3e7bc81aebb23dfc270689d86de6b241f4ee50a9cf7f03f5b905515ca59206');
  assert.doesNotMatch(ea,/OrderSend\s*\(|WebRequest\s*\(|CTrade/);
});
test('strategy contains simulation guards, aligned HTF data, bounded stats and opt-in alerts',()=>{
  const pine=fs.readFileSync(path,'utf8'), indicator=fs.readFileSync('reference/legacy-ea/TradingBrain_GOLD_M1_VLB_VHB.pine','utf8');
  for(const token of ['M5_high = request.security','M5_low = request.security','M5_close = request.security','M5_bar_index = request.security','M5_BT_0382 = M5_high - M5_range * 0.382','M5_FTB_0382 = M5_low + M5_range * 0.382']) {
    assert.ok(indicator.includes(token) && pine.includes(token),token);
  }
  assert.match(pine,/input\.bool\(false, "Enable simulated strategy/);
  assert.match(pine,/input\.bool\(false, "Enable simulated signal JSON alerts/);
  assert.match(pine,/inDateRange = Backtest_Start <= Backtest_End/);assert.match(pine,/month\(time, "UTC"\)/);
  assert.match(pine,/strategy\.entry\("VLB Sell", strategy\.short/);assert.match(pine,/strategy\.entry\("VHB Buy", strategy\.long/);
  assert.match(pine,/strategy\.exit\("VLB TP\/SL"/);assert.match(pine,/strategy\.exit\("VHB TP\/SL"/);
  assert.match(pine,/justClosed/);assert.match(pine,/lastEntryBar/);assert.match(pine,/barstate\.isconfirmed/);
  assert.match(pine,/array\.size\(recentPL\) > 500/);assert.match(pine,/strategy\.closedtrades\.exit_time\(i\)/);
  assert.match(pine,/Max DD \(closed only\)/);assert.match(pine,/Avg gross price R/);
  assert.match(pine,/alertcondition\(sellSignal/);assert.match(pine,/alert\(alertJson\("SELL"/);assert.match(pine,/alert\(alertJson\("BUY"/);
  assert.match(pine,/alertcondition\(\) has no effect for strategies/);assert.match(pine,/SIMULATION_ONLY/);
  assert.doesNotMatch(pine,/\{\{M5_Bias\}\}/);
});

// Separate JS reference for metric semantics; not a Pine execution or backtest.
function metrics(trades, recent) {
  const view=recent?trades.slice(-500):trades; let win=0, gain=0, loss=0, eq=0, peak=0, dd=0, rs=0,rn=0;
  const quarters=Array.from({length:4},()=>({gain:0,loss:0}));
  for(const t of view){const p=t.profit;win+=p>0?1:0;gain+=Math.max(p,0);loss+=Math.max(-p,0);eq+=p;peak=Math.max(peak,eq);dd=Math.max(dd,peak-eq);const stopValid=t.side==='SELL'?t.stop>t.entry:t.stop<t.entry;if(stopValid){rs+=(t.side==='SELL'?t.entry-t.exit:t.exit-t.entry)/Math.abs(t.entry-t.stop);rn++;}const q=Math.floor(new Date(t.exitTime).getUTCMonth()/3);quarters[q].gain+=Math.max(p,0);quarters[q].loss+=Math.max(-p,0);}
  return {n:view.length,winRate:view.length?100*win/view.length:null,pf:loss?gain/loss:null,dd:view.length?dd:null,avgR:rn?rs/rn:null,rn,quarters:quarters.map(x=>x.loss?x.gain/x.loss:null)};
}
test('closed trade metrics handle breakeven, gaps, UTC exit quarter and zero denominators',()=>{
  const a={profit:10,entry:100,exit:120,stop:90,side:'BUY',exitTime:'2025-03-31T23:59:59Z'};
  const b={profit:-5,entry:100,exit:90,stop:110,side:'BUY',exitTime:'2025-04-01T00:00:00Z'};
  const c={profit:0,entry:100,exit:100,stop:110,side:'SELL',exitTime:'2025-04-01T00:01:00Z'};
  const m=metrics([a,b,c],false);assert.equal(m.n,3);assert.equal(m.winRate,100/3);assert.equal(m.pf,2);assert.equal(m.dd,5);assert.equal(m.avgR,1);assert.equal(m.rn,2);assert.deepEqual(m.quarters,[null,0,null,null]);
  assert.equal(metrics([],false).pf,null);assert.equal(metrics([a],false).pf,null);
});
test('last 500 changes only the custom subset and resets subset drawdown peak',()=>{
  const a={profit:-2,entry:100,exit:90,stop:90,side:'BUY',exitTime:'2024-01-01T00:00:00Z'};
  const b={profit:1,entry:100,exit:110,stop:90,side:'BUY',exitTime:'2024-04-01T00:00:00Z'};
  const trades=[a,...Array.from({length:501},()=>b)];const all=metrics(trades,false),last=metrics(trades,true);
  assert.equal(all.n,502);assert.equal(last.n,500);assert.equal(all.dd,2);assert.equal(last.dd,0);assert.equal(last.pf,null);
});
