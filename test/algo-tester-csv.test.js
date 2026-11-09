const { test } = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../lib/algo-tester-csv.mjs');
const header='time_broker,symbol,deal_id,position_id,deal_type,entry_type,volume,price,profit,commission,swap,currency,reason';
const buy='2026.11.09 10:01:00,XAUUSD,1234567890123456789,999,DEAL_TYPE_BUY,DEAL_ENTRY_IN,0.10,2000.5,0,-0.3,0,USD,DEAL_REASON_EXPERT';
const sell='2026.11.09 10:15:00,XAUUSD,1234567890123456790,999,DEAL_TYPE_SELL,DEAL_ENTRY_OUT,0.10,2003.5,30,-0.3,-0.1,USD,DEAL_REASON_TP';

test('tester CSV preserves deal IDs and parses signed amounts, BOM and CRLF', async () => {
  const { parseAlgoTesterCSV }=await modulePromise;
  const rows=parseAlgoTesterCSV(`\uFEFF${header}\r\n${buy}\r\n${sell}\r\n`);
  assert.equal(rows.length,2); assert.equal(rows[0].deal_id,'1234567890123456789');
  assert.equal(rows[1].profit,30); assert.equal(rows[1].commission,-0.3);
  assert.equal(rows[0].time_broker,'2026.11.09 10:01:00');
});

test('CSV parser handles quoted fields and rejects malformed, duplicate and unrelated files', async () => {
  const { parseAlgoTesterCSV }=await modulePromise;
  assert.equal(parseAlgoTesterCSV(`${header}\n${buy.replace('XAUUSD','"XAU,USD"')}\n`)[0].symbol,'XAU,USD');
  assert.throws(()=>parseAlgoTesterCSV('Time,Symbol,Profit\nnow,XAUUSD,1'),/header/);
  assert.throws(()=>parseAlgoTesterCSV(`${header}\n${buy}\n${buy}`),/duplicate/);
  assert.throws(()=>parseAlgoTesterCSV(`${header}\n${buy.replace('0.10','')}\n`),/volume/);
  assert.throws(()=>parseAlgoTesterCSV(`${header}\n${buy.replace('XAUUSD','"XAUUSD')}\n`),/Unclosed/);
  assert.throws(()=>parseAlgoTesterCSV(`${header}\n${buy.replace('DEAL_ENTRY_IN','UNKNOWN')}\n`),/deal type/);
});
