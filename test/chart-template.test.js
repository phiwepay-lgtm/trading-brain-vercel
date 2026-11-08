const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');

test('hand-authored template draft is visual only and is not presented as verified',()=>{
  const bytes=readFileSync('public/ea/TradingBrain_Visual_Draft.tpl');
  assert.deepEqual([...bytes.subarray(0,3)],[0xef,0xbb,0xbf]);
  const text=bytes.subarray(3).toString('utf8');
  assert.ok(text.startsWith('<chart>\r\n'));assert.match(text,/\r\nperiod_size=1\r\n/);assert.match(text,/\r\nmode=1\r\n/);
  assert.match(text,/<window>\r\n/);assert.match(text,/<indicator>\r\nname=Main\r\npath=\r\n/);assert.match(text,/<\/window>\r\n<\/chart>\r\n$/);
  assert.doesNotMatch(text,/<expert>|<script>|\.ex5|\.mq5|Enable_Simulation|Order_Quantity/i);
  const page=readFileSync('app/ea/download-center.tsx','utf8');assert.match(page,/not MT5-generated or load-tested/);
  const guide=readFileSync('docs/mt5-chart-template-draft.md','utf8');assert.match(guide,/has not been opened or validated in an MT5 terminal/);assert.match(guide,/does not automate or contain the Trading Brain edge/);
});
