// Browser-side market history import. Never sends the imported file to a server.
export const MAX_HISTORY_BYTES=128*1024*1024;
export const MAX_HISTORY_ROWS=2000000;
function fields(line, delimiter) {
  const out=[];let value='',quoted=false;
  for(let i=0;i<line.length;i++) {
    const c=line[i];
    if(c==='"') {if(quoted && line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(c===delimiter && !quoted){out.push(value.trim());value='';}
    else value+=c;
  }
  if(quoted) throw new Error('Unclosed quoted CSV field');
  out.push(value.trim());return out;
}
function timestamp(value, assumeUTC) {
  const raw=value.trim();
  if (/^(?:\d{10}|\d{13})$/.test(raw)) {const n=Number(raw);return raw.length===13?n/1000:n;}
  const text=raw.replace(/^(\d{4})\.(\d{2})\.(\d{2})/,'$1-$2-$3').replace(' ','T');
  const match=text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?$/i);
  if (!match) throw new Error('Use an ISO date/time, epoch, or MT5 date and time');
  const [,year,month,day,hour,minute,second='00',zone]=match;
  if (!zone && !assumeUTC) throw new Error('Timezone missing: confirm file times are UTC or provide Z/offset');
  const iso=`${year}-${month}-${day}T${hour}:${minute}:${second}${zone || 'Z'}`;
  const check=new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  if (!Number.isFinite(check.getTime()) || check.getUTCFullYear()!==Number(year) || check.getUTCMonth()+1!==Number(month) || check.getUTCDate()!==Number(day) || Number(hour)>23 || Number(minute)>59 || Number(second)>59) throw new Error('Invalid date or time');
  return Date.parse(iso)/1000;
}
/** Parse timestamp,open,high,low,close[,volume], or MT5 <DATE>/<TIME> export. */
export function parseMarketCSV(text,{assumeUTC=false,maxRows=MAX_HISTORY_ROWS}={}) {
  if (typeof text!=='string') throw new TypeError('Expected CSV text');
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
  const header=lines.shift(); if (!header) throw new Error('CSV is empty');
  const delimiter=header.includes('\t')?'\t':header.includes(';')?';':',';
  const names=fields(header,delimiter).map(x=>x.toLowerCase().replace(/[<>\s_-]/g,''));
  const pick=(...namesToFind)=>names.findIndex(n=>namesToFind.includes(n));
  const dateIndex=pick('date'), timeIndex=pick('time','timestamp','datetime','opentime'), o=pick('open'), h=pick('high'), l=pick('low'), c=pick('close'), vol=pick('volume','tickvol','tickvolume');
  if (timeIndex<0 || [o,h,l,c].some(i=>i<0)) throw new Error('CSV needs time, open, high, low and close columns (or MT5 date + time).');
  const out=[];
  for(let i=0;i<lines.length;i++) {
    if (!lines[i].trim()) continue;
    if(out.length>=maxRows) throw new Error(`History exceeds ${maxRows.toLocaleString()} rows; split the file into a shorter period.`);
    try {
      const row=fields(lines[i],delimiter), rawTime=dateIndex>=0?`${row[dateIndex]} ${row[timeIndex]}`:row[timeIndex];
      if(!rawTime || [o,h,l,c].some(j=>row[j]===undefined || row[j]===''))throw new Error('Missing required value');
      const time=timestamp(rawTime,assumeUTC), open=Number(row[o]), high=Number(row[h]), low=Number(row[l]), close=Number(row[c]);
      const volume=vol<0 || row[vol]==='' || row[vol]===undefined ? null : Number(row[vol]);
      if(!Number.isSafeInteger(time) || !Number.isFinite(new Date(time*1000).getTime()) || time%60!==0 || ![open,high,low,close].every(x=>Number.isFinite(x)&&x>0) || high<Math.max(open,close,low) || low>Math.min(open,close,high) || (volume!==null && (!Number.isFinite(volume)||volume<0))) throw new Error('Invalid M1 time, OHLC or volume');
      out.push({time,open,high,low,close,volume});
    } catch(error) {throw new Error(`Row ${i+2}: ${error instanceof Error?error.message:'Invalid data'}`);}
  }
  if (!out.length) throw new Error('CSV contains no candles');
  out.sort((a,b)=>a.time-b.time);
  for(let i=1;i<out.length;i++) if(out[i].time===out[i-1].time)throw new Error(`Duplicate timestamp at ${new Date(out[i].time*1000).toISOString()}; resolve duplicates before importing.`);
  return out;
}
/** Only full, consecutive five-minute UTC buckets become M5; gaps are not filled. */
export function buildM5(m1) {
  const bars=[];let incomplete=0;
  for(let i=0;i<m1.length;) {
    const time=Math.floor(m1[i].time/300)*300,start=i;
    while(i<m1.length && Math.floor(m1[i].time/300)*300===time)i++;
    if(i-start!==5 || m1[start].time!==time || m1[i-1].time!==time+240){incomplete++;continue;}
    const group=m1.slice(start,i), volumes=group.map(b=>b.volume);
    bars.push({time,open:group[0].open,high:Math.max(...group.map(b=>b.high)),low:Math.min(...group.map(b=>b.low)),close:group[4].close,volume:volumes.every(x=>x!==null)?volumes.reduce((a,b)=>a+b,0):null});
  }
  return {bars,incomplete};
}
export function historyQuality(m1) {
  let gaps=0,missingMinutes=0,largestGap=0;
  for(let i=1;i<m1.length;i++) {const missing=(m1[i].time-m1[i-1].time)/60-1;if(missing>0){gaps++;missingMinutes+=missing;largestGap=Math.max(largestGap,missing);}}
  return {count:m1.length,first:m1[0]?.time??null,last:m1.at(-1)?.time??null,gaps,missingMinutes,largestGap};
}
