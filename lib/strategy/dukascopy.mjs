// Decode only the actual minute records in Dukascopy's delta JSON response.
// The MIT-licensed dukascopy-node 1.51.1 normalizer inserts flat candles for
// time deltas; we deliberately do not, and do not discard real flat records.
// Format reference: github.com/Leo4815162342/dukascopy-node.
export function decodeDukascopyMinutes(data) {
  if (!data || !Array.isArray(data.times) || !Number.isFinite(data.timestamp)) throw new Error('Invalid candle payload');
  const columns=[data.opens,data.highs,data.lows,data.closes,data.volumes];
  if(columns.some(x=>!Array.isArray(x)||x.length!==data.times.length||x.some(v=>!Number.isFinite(v))) || data.times.some(v=>!Number.isInteger(v)||v<0)) throw new Error('Invalid candle columns');
  if(!data.times.length)return [];
  const multiplier=data.multiplier, shift=data.shift;
  if(!Number.isFinite(multiplier)||multiplier<=0||!Number.isFinite(shift)||shift<=0||![data.open,data.high,data.low,data.close].every(Number.isFinite))throw new Error('Invalid candle base');
  const [coefficient,exponent='0']=multiplier.toString().toLowerCase().split('e');
  const scale=Math.max(0,(coefficient.split('.')[1]?.length||0)-Number(exponent));
  if(!Number.isInteger(scale)||scale>12)throw new Error('Invalid candle precision');
  let time=data.timestamp, open=Math.round(data.open/multiplier),high=Math.round(data.high/multiplier),low=Math.round(data.low/multiplier),close=Math.round(data.close/multiplier);
  const price=n=>Number((n*multiplier).toFixed(scale));
  return data.times.map((delta,i)=>{
    time+=delta*shift;open+=data.opens[i];high+=data.highs[i];low+=data.lows[i];close+=data.closes[i];
    const row={time:time/1000,open:price(open),high:price(high),low:price(low),close:price(close),volume:data.volumes[i]};
    if(!Number.isSafeInteger(row.time)||row.time%60!==0||![row.open,row.high,row.low,row.close].every(x=>Number.isFinite(x)&&x>0)||row.high<Math.max(row.open,row.close,row.low)||row.low>Math.min(row.open,row.close,row.high)||row.volume<0)throw new Error('Invalid decoded candle');
    return row;
  });
}
