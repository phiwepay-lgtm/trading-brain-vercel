const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const pine = fs.readFileSync('public/ea/TradingView_Algo_V2_Study_Indicator.pine', 'utf8');
test('Algo V1 exposes a restricted price-action research draft', () => {
  for (const s of [
    'ticker.heikinashi(syminfo.tickerid)', 'lookahead=barmerge.lookahead_on',
    '[time[1], fibValue[1], touch[1], event[1], pHigh[1], pLow[1], upperAnchor[1], lowerAnchor[1]]',
    'low <= fibNow and high >= fibNow', 'high < legHigh', 'low > legLow',
    'event := trend == 1 ? -2 : 2', 'chart.is_standard',
    'bullChoch', 'bearChoch', 'bullEngulf', 'bearEngulf',
    'options=["2", "3", "4", "5", "7"]', 'options=["Off", "2", "3"]',
    'if gap', 'exitTarget := not hitStop and hitTarget', 'stop := entry',
    'plotshape(isM1 and not na(m1High)', 'alertcondition(newM5 and touch != 0',
    'ignore_invalid_symbol=true', 'alert.freq_all',
  ]) assert.ok(pine.includes(s), `Missing ${s}`);
  assert.doesNotMatch(pine, /strategy\.(entry|order|exit)/);
});

const strategy = fs.readFileSync('public/ea/TradingView_Algo_V2_Study_Strategy.pine', 'utf8');
test('strategy uses native simulated orders alongside the same provisional signals', () => {
  assert.match(strategy, /^\/\/@version=5\r?\nstrategy\(/);
  for (const s of ['process_orders_on_close=true', 'strategy.entry("Long", strategy.long)', 'strategy.entry("Short", strategy.short)', 'strategy.exit("Long bracket"', 'strategy.exit("Short bracket"', 'strategy.close_all(comment="Gap: result unreliable"', 'nativeStop := nativeEntry', 'event := trend == 1 ? -2 : 2', 'bullEngulf', 'bearEngulf']) assert.ok(strategy.includes(s), `Missing ${s}`);
});

test('MT5 sources share an engine and the tester EA fails closed outside the tester', () => {
  const core = fs.readFileSync('mt5/AlgoV1/MQL5/Include/AlgoV1Core.mqh', 'utf8');
  const indicator = fs.readFileSync('mt5/AlgoV1/MQL5/Indicators/AlgoV1Research.mq5', 'utf8');
  const ea = fs.readFileSync('mt5/AlgoV1/MQL5/Experts/AlgoV2TesterResearch.mq5', 'utf8');
  for (const s of ['AlgoBuildHA', 'AlgoReplay', 'a[i].time-a[i-1].time!=60', 'm5[j].time+300==m1[i].time', 'a[i].high<legHigh', 'a[i].low>legLow']) assert.ok(core.includes(s), `Missing ${s}`);
  assert.match(indicator, /#include <AlgoV1Core\.mqh>/);
  assert.match(ea, /input bool EnableTesterOrders=false/);
  assert.match(ea, /if\(!MQLInfoInteger\(MQL_TESTER\)\).*INIT_FAILED/);
  assert.match(ea, /if\(!EnableTesterOrders \|\| PositionsTotal\(\)!=0 \|\| !ValidLots\(\)\) return/);
  assert.match(ea, /trade\.PositionModify/);
});

test('MT5 package contains the same source files shown in the repository', async () => {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(fs.readFileSync('public/ea/Algo_V1_MT5_Research.zip'));
  for (const name of ['MQL5/Experts/AlgoV2TesterResearch.mq5', 'MQL5/Indicators/AlgoV1Research.mq5', 'MQL5/Include/AlgoV1Core.mqh', 'README.txt']) {
    assert.ok(zip.file(name), `Missing ${name}`);
    assert.equal(await zip.file(name).async('string'), fs.readFileSync(`mt5/AlgoV1/${name}`, 'utf8'));
  }
});

test('V2 Pine drafts retain study levels, bounded simulated recaps and monitor slots', () => {
  for (const src of [pine, strategy]) {
    for (const text of [
      'max_lines_count=500', 'showStudyLevels', 'showBreakLines', 'studyDrawCount * 7',
      'f_studyLevel(entry + d * risk * 2, "2R"', 'f_studyLevel(entry + d * risk * 3, "3R"',
      'f_studyLevel(entry + d * risk * 4, "4R"', 'f_studyLevel(entry + d * risk * 5, "5R"',
      'f_studyLevel(entry + d * risk * 7, "7R"', 'if stopHit', 'next := armed ? 2 : -1',
      'next := -2', 'bar_index > t.born', 'array.size(study) > studySampleCount',
      'timestamp(syminfo.timezone, localYear, localMonth, localDay - dayOffset, 0, 0)',
      'TP/(TP+SL+BE+STRUCT)', 'scan9 = input.bool(false', 'plot(validChart ? upper : na',
    ]) assert.ok(src.includes(text), `Missing ${text}`);
  }
});

test('MT5 V2 tester includes bounded visuals and public sources match the package', () => {
  const ea = fs.readFileSync('mt5/AlgoV1/MQL5/Experts/AlgoV2TesterResearch.mq5', 'utf8');
  for (const text of ['ShowVisualStudy=true', 'MQL_VISUAL_MODE', 'DrawVisual(m1,i,results[i])', 'DrawFib(t,r)', 'r.chochAnchorTime', '"2R","3R","4R","5R","7R"', 'n+1>MaxStudySets']) assert.ok(ea.includes(text), `Missing ${text}`);
  assert.equal(fs.readFileSync('public/ea/AlgoV2TesterResearch.mq5', 'utf8'), ea);
  assert.equal(fs.readFileSync('public/ea/AlgoV1Core.mqh', 'utf8'), fs.readFileSync('mt5/AlgoV1/MQL5/Include/AlgoV1Core.mqh', 'utf8'));
});

test('scanner is driven by completed M5 data and exports numeric study plots', () => {
  for (const src of [pine, strategy]) {
    for (const s of ['showScanner = input.bool(true', 'seenTime + 300000 == time("5")', '"NO DATA"', '"STALE"', '"TOUCH"', 'f_scanRow(scanner, 10, scan9', '"Research signal direction (+1/-1)"', '"Research 7R level"', 'display=display.data_window']) assert.ok(src.includes(s), `Missing ${s}`);
  }
});

test('MT5 optional deal log is tester-only and labels actual deal events', () => {
  const ea=fs.readFileSync('mt5/AlgoV1/MQL5/Experts/AlgoV2TesterResearch.mq5','utf8');
  for(const s of ['input bool SaveTesterDealsCSV=false', '!MQLInfoInteger(MQL_TESTER)', 'TRADE_TRANSACTION_DEAL_ADD', 'HistorySelectByPosition', '"time_broker","symbol","deal_id","position_id"', 'DEAL_COMMISSION', 'DEAL_SWAP', 'FileFlush(dealFile)']) assert.ok(ea.includes(s), `Missing ${s}`);
});

test('latest rule waits for a retest and requires an immediate engulf after LH/HL CHoCH', () => {
  const core=fs.readFileSync('mt5/AlgoV1/MQL5/Include/AlgoV1Core.mqh','utf8');
  for(const s of ['touchDirection!=0 && (mode==0 || mode==1)', 'm1High<previousM1High', 'm1Low>previousM1Low', 'i==waitFrom+1', 'phase=0; // An engulf must occur on the immediate next bar.']) assert.ok(core.includes(s), `Missing ${s}`);
  for(const src of [pine,strategy]) for(const s of ['touch != 0 and (mode == "Both" or mode == "Continuation")', 'lastHigh < previousHigh', 'lastLow > previousLow', 'bar_index == waitFrom + 1']) assert.ok(src.includes(s), `Missing ${s}`);
  assert.equal(fs.readFileSync('public/ea/AlgoV1Research.mq5','utf8'),fs.readFileSync('mt5/AlgoV1/MQL5/Indicators/AlgoV1Research.mq5','utf8'));
});

test('user V3 is a separate clearly disclosed reference, not a validated replacement', () => {
  const v3=fs.readFileSync('public/ea/M5_HA_Brain_V3_User_Reference.pine','utf8');
  const page=fs.readFileSync('app/ea/download-center.tsx','utf8');
  const notes=fs.readFileSync('docs/tradingview-indicator-algo-v1-research.md','utf8');
  assert.match(v3, /^\/\/@version=5\r?\nindicator\("M5 HA Brain V3/);
  for(const s of ['chochLen = input.int(5', 'bar_index - lastLHBar <= 3', 'bar_index - lastHLBar <= 3', 'bullCHoCH and bullEng', 'bearCHoCH and bearEng', 'math.abs(close - orangePivotHigh)']) assert.ok(v3.includes(s));
  assert.match(page,/V3 — supplied reference only/);
  assert.match(notes,/cannot pass at the default setting/);
  assert.match(notes,/FTB is absent/);
});

test('structure exit is available in both Pine scripts and the MT5 tester', () => {
  const core=fs.readFileSync('mt5/AlgoV1/MQL5/Include/AlgoV1Core.mqh','utf8');
  const ea=fs.readFileSync('mt5/AlgoV1/MQL5/Experts/AlgoV2TesterResearch.mq5','utf8');
  for(const src of [pine,strategy]) for(const s of ['Fixed TP + structure', 'bar_index - right >= entryBar', 'exitStructure := true', 'Virtual structure exit', 'TP/(TP+SL+BE+STRUCT)']) assert.ok(src.includes(s), `Missing ${s}`);
  for(const s of ['i-r>=entryBar', 'out.structureExit=true', 'out.structureDirection=tradeDir']) assert.ok(core.includes(s), `Missing ${s}`);
  for(const s of ['input bool UseStructureExit=true', 'results[i].structureExit', 'trade.PositionClose(trackedTicket)']) assert.ok(ea.includes(s), `Missing ${s}`);
});

test('corrected V3 study retains the provisional sequence and bounded visual boxes', () => {
  const v3=fs.readFileSync('public/ea/TradingView_Algo_V3_Study_Indicator.pine','utf8');
  for(const s of ['TradingView Algo V3 Study Indicator - Research', 'bar_index == waitFrom + 1', 'Fixed TP + structure', 'color=color.yellow, style=line.style_dashed', 'box riskBox = box.new', 'box rewardBox = box.new', 'array.size(riskBoxes) > studyDrawCount * 2']) assert.ok(v3.includes(s), `Missing ${s}`);
});
