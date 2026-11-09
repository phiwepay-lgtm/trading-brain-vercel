const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const root='reference/legacy-ea/superseded-pro-v1/TradingBrain_Pro_V1_';

test('TradingView sources have Pine declarations and cannot be mistaken for MT5 sources',()=>{
  for (const [file,declaration] of [['Indicator.pine','indicator'],['Strategy.pine','strategy']]) {
    const source=readFileSync(root+file,'utf8');
    assert.match(source,new RegExp(`^\\/\\/@version=5\\r?\\n${declaration}\\(`));
    assert.doesNotMatch(source,/^\s*#property\b|^\s*input\s+bool\s+\w+\s*=/m);
  }
  for (const file of ['Indicator.mq5','Tester.mq5']) {
    const source=readFileSync(root+file,'utf8');
    assert.match(source,/^#property strict$/m);
    assert.doesNotMatch(source,/^\/\/@version=/m);
  }
});

test('TradingView source declarations retain their intended simulation restrictions',()=>{
  const indicator=readFileSync(root+'Indicator.pine','utf8');
  const strategy=readFileSync(root+'Strategy.pine','utf8');
  const tester=readFileSync(root+'Tester.mq5','utf8');
  assert.doesNotMatch(indicator,/strategy\.(?:entry|order|exit)\s*\(/);
  assert.match(strategy,/Enable_Simulation = input\.bool\(false/);
  assert.match(tester,/if\(!MQLInfoInteger\(MQL_TESTER\) \|\| !Enable_Simulation \|\| !Enable_StrategyTester_Orders\) return false/);
});
