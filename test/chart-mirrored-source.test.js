const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const read=p=>readFileSync(p,'utf8');
test('separate mirrored Pine source follows selected bearish BT anchors without changing the old draft',()=>{
  const pine=read('reference/legacy-ea/TradingBrain_M5_M1_v153_Mirrored.pine');
  assert.match(pine,/bearBos = isGoldenSession and newHaM5 and validHaLow and haClose < haSwingLow/);
  assert.match(pine,/bosLegHigh := setupType == "BT" \? \(direction == 1 \? haHigh : \(validHaHigh \? haSwingHigh : na\)\)/);
  assert.match(pine,/bosLegLow \+ legRange \* 0\.382/);
  assert.match(pine,/setupType == "FTB" or \(setupType == "BT" and nearFib\)/);
  assert.match(pine,/input\.bool\(false, "Enable structural simulation/);
  assert.match(pine,/process_orders_on_close=true/);
  const old=read('reference/legacy-ea/TradingBrain_M5_M1_v15.pine');assert.match(old,/haBearStructure and haClose < haSwingLow/);
  assert.equal(createHash('sha256').update(read('reference/legacy-ea/TradingBrain_M5_M1_v14.pine')).digest('hex'),'a62c6ba168f9a3e202410d7dd291994c41a1b343bd1fb73ef0fcaede1bd85f3f');
});
test('mirrored indicator shares the strategy draft candidate gates but never submits orders',()=>{
  const strategy=read('reference/legacy-ea/TradingBrain_M5_M1_v153_Mirrored.pine');
  const indicator=read('reference/legacy-ea/TradingBrain_Indicator_v153_Mirrored.pine');
  assert.match(indicator,/indicator\("TradingBrain v15\.3 Mirrored/);assert.doesNotMatch(indicator,/strategy\.(entry|exit|order|position_size|closedtrades)/);
  for(const prefix of ['bullBos =','bearBos =','failedHigh =','failedLow =','            bosLegLow :=','            bosLegHigh :=','            fib0382 := anchorsValid','            bullEngulf =','            bearEngulf =','            pathReady =','            canConfirm =']) {
    const line=source=>source.split('\n').find(x=>x.startsWith(prefix));
    assert.ok(line(strategy),`missing strategy ${prefix}`);assert.equal(line(indicator),line(strategy),prefix);
  }
  assert.match(indicator,/virtualPosition := 1/);assert.match(indicator,/virtualPosition := -1/);assert.match(indicator,/alertcondition\(buyEntry/);
  assert.match(indicator,/input\.bool\(false, "Enable structural simulation/);
});
