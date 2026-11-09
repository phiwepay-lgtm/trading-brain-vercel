// Structural checks only: they cannot compile or execute Pine or MQL.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path='reference/retired-ea/TradingBrain_Pro_V1_';
const read=name=>readFileSync(path+name,'utf8');

test('Pine drafts keep BT reaction and FTB bypass, without the old entry proximity gate',()=>{
  for(const s of [read('Indicator.pine'),read('Strategy.pine')]) {
    assert.match(s,/state == "WAITING_0382".*low <= fib0382 and high >= fib0382/);
    assert.match(s,/pathReady = setupType == "FTB" or \(setupType == "BT" and not na\(fib0382\)\)/);
    assert.doesNotMatch(s,/Fib_Tolerance_Ticks|nearFib/);
    assert.doesNotMatch(s,/else if strategy\.position_size != 0|else if virtualPosition != 0/);
    assert.match(s,/array\.push\(vDirections, 1\)/);
    assert.match(s,/array\.push\(vDirections, -1\)/);
    assert.match(s,/both = not openStop and not openTarget and stopHit and targetHit/);
    assert.match(s,/vCensored \+=/);
    assert.match(s,/Entry signals/);
  }
});

test('Pine indicator sends no orders; strategy identifies native netting and remains opt-in',()=>{
  const indicator=read('Indicator.pine'),strategy=read('Strategy.pine');
  assert.doesNotMatch(indicator,/strategy\.(entry|exit|order)/);
  assert.match(indicator,/input\.bool\(true, "Enable structural simulation \(visual research only\)"/);
  assert.match(strategy,/input\.bool\(false, "Enable structural simulation/);
  assert.match(strategy,/pyramiding=100/);
  assert.match(strategy,/NETTING \/ MAY DIFFER/);
  assert.match(strategy,/orderId = "Buy_" \+ str\.tostring\(bar_index\)/);
  assert.match(strategy,/orderId = "Sell_" \+ str\.tostring\(bar_index\)/);
});

test('MT5 indicator is visual only and tester EA fails closed outside tester and hedging mode',()=>{
  const indicator=read('Indicator.mq5'),ea=read('Tester.mq5');
  assert.match(indicator,/#property indicator_chart_window/);
  assert.match(indicator,/CopyRates\(_Symbol,PERIOD_M1,shift,2000,m1\)/);
  assert.match(indicator,/CopyRates\(_Symbol,PERIOD_M5,m5shift\+1,HA_History_Bars,m5\)/);
  assert.match(indicator,/virtualCensored\+\+/);
  assert.doesNotMatch(indicator,/\b(?:CTrade|OrderSend|OrderSendAsync|WebRequest|FileOpen)\b/);
  assert.match(ea,/if\(!MQLInfoInteger\(MQL_TESTER\)\) \{ Print\("TB Pro V1: Strategy Tester only; no live or demo operation\."\); return INIT_FAILED; \}/);
  assert.match(ea,/ACCOUNT_MARGIN_MODE_RETAIL_HEDGING/);
  assert.match(ea,/if\(!MQLInfoInteger\(MQL_TESTER\) \|\| !Enable_Simulation \|\| !Enable_StrategyTester_Orders\) return false/);
  assert.doesNotMatch(ea,/PositionSelect\(|Fib_Tolerance_Ticks|WebRequest\s*\(|FileOpen\s*\(/);
  for(const s of [indicator,ea]) {
    assert.match(s,/state==WAITING_0382.*m1\[k\]\.low<=fib && m1\[k\]\.high>=fib/);
    assert.match(s,/pathReady=setupType=="FTB" \|\| \(setupType=="BT" && fib>0\)/);
  }
});
