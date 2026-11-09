// Parses only Algo V2 Strategy Tester deal logs; never interprets them as live trades.
export const MAX_ALGO_CSV_BYTES = 4_000_000;
export const MAX_ALGO_CSV_ROWS = 10000;
const columns = ['time_broker','symbol','deal_id','position_id','deal_type','entry_type','volume','price','profit','commission','swap','currency','reason'];

function csvRows(text) {
  const rows=[]; let row=[], field='', quoted=false, closed=false, started=false;
  const emitField=()=>{ row.push(field); field=''; closed=false; started=false; };
  const emitRow=()=>{ emitField(); if(row.some(cell=>cell!=='')) rows.push(row); row=[]; if(rows.length>MAX_ALGO_CSV_ROWS+1) throw new Error('CSV exceeds 10,000 deals.'); };
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) {
      if(c==='"') { if(text[i+1]==='"'){field+='"';i++;} else {quoted=false;closed=true;} }
      else field+=c;
    } else if(c==='"') {
      if(started || closed) throw new Error('Invalid quote in CSV.');
      quoted=true; started=true;
    } else if(c===',') emitField();
    else if(c==='\r' || c==='\n') { if(c==='\r' && text[i+1]==='\n') i++; emitRow(); }
    else { if(closed) throw new Error('Unexpected text after a quoted field.'); field+=c; started=true; }
  }
  if(quoted) throw new Error('Unclosed quoted field in CSV.');
  if(field || row.length || closed) emitRow();
  return rows;
}

export function parseAlgoTesterCSV(text) {
  if(typeof text!=='string') throw new Error('Expected a CSV file.');
  if(new TextEncoder().encode(text).length>MAX_ALGO_CSV_BYTES) throw new Error('CSV exceeds 4 MB.');
  const rows=csvRows(text.replace(/^\uFEFF/,''));
  const header=rows.shift();
  if(!header || header.length!==columns.length || columns.some((c,i)=>header[i]!==c)) throw new Error('Not an Algo V2 tester-deal CSV: the header does not match.');
  if(rows.length===0) throw new Error('The file contains no deals.');
  const ids=new Set();
  return rows.map((row,index)=>{
    const fail=message=>{throw new Error(`Row ${index+2}: ${message}`);};
    if(row.length!==columns.length || row.some(v=>v.length>256)) fail('invalid field count or length.');
    const obj=Object.fromEntries(columns.map((key,i)=>[key,row[i]]));
    if(!/^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}$/.test(obj.time_broker)) fail('invalid broker time.');
    if(!/^\d+$/.test(obj.deal_id) || !/^\d+$/.test(obj.position_id)) fail('invalid deal or position ID.');
    if(ids.has(obj.deal_id)) fail('duplicate deal ID.'); ids.add(obj.deal_id);
    if(!obj.symbol || !obj.currency || !['DEAL_TYPE_BUY','DEAL_TYPE_SELL'].includes(obj.deal_type) || !['DEAL_ENTRY_IN','DEAL_ENTRY_OUT','DEAL_ENTRY_OUT_BY'].includes(obj.entry_type)) fail('invalid symbol, currency or deal type.');
    const numeric={};
    for(const key of ['volume','price','profit','commission','swap']) {
      if(obj[key].trim()==='' || !Number.isFinite(Number(obj[key]))) fail(`invalid ${key}.`);
      numeric[key]=Number(obj[key]);
    }
    if(numeric.volume<=0) fail('volume must be positive.');
    return {...obj,...numeric};
  });
}
