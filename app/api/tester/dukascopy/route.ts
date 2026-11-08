import { BufferFetcher, generateUrls } from 'dukascopy-node';
import { decodeDukascopyMinutes } from '../../../../lib/strategy/dukascopy.mjs';
import { chartAccess } from '../../../../lib/chart-server';

// One UTC day per request keeps each serverless invocation bounded. The browser
// coordinates the full requested range; no price history is stored here.
export const dynamic='force-dynamic';
export const maxDuration=30;
export async function GET(request:Request) {
  const denied=chartAccess(request);if(denied)return denied;
  const q=new URL(request.url).searchParams, day=q.get('day'), symbol=q.get('symbol');
  const instruments={XAUUSD:'xauusd',EURUSD:'eurusd',BTCUSD:'btcusd'} as const;
  if(!day||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!symbol||!Object.hasOwn(instruments,symbol))return Response.json({error:'Choose a supported symbol and UTC day.'},{status:400});
  const start=Date.parse(day+'T00:00:00Z');
  if(!Number.isFinite(start)||new Date(start).toISOString().slice(0,10)!==day||start<0||start>=Date.now())return Response.json({error:'Invalid or future UTC day.'},{status:400});
  try {
    const urls=generateUrls({instrument:instruments[symbol as keyof typeof instruments],timeframe:'m1',priceType:'bid',startDate:new Date(start),endDate:new Date(start+86400000)});
    const fetcher=new BufferFetcher({batchSize:1,pauseBetweenBatchesMs:0,retryCount:1,rateLimitRetryCount:1,retryOnEmpty:false,failAfterRetryCount:true,pauseBetweenRetriesMs:500,wafMode:'off',wafTokenCache:false});
    const buffers=await fetcher.fetch(urls);
    if(buffers.length!==urls.length)throw new Error('Missing provider response');
    const now=Date.now();
    const result=buffers.flatMap(({buffer})=>decodeDukascopyMinutes(JSON.parse(buffer.toString('utf8')))).filter((row:{time:number})=>row.time>=start/1000&&row.time<(start+86400000)/1000&&row.time*1000+60000<=now);
    for(let i=1;i<result.length;i++)if(result[i].time<=result[i-1].time)throw new Error('Unordered or duplicate provider candles');
    return Response.json(result,{headers:{'Cache-Control':'no-store','X-Chart-Source':'dukascopy','X-Chart-Instrument':`${symbol} DUKASCOPY BID`}});
  } catch {
    // Do not turn throttling, WAF challenges or network failures into empty data.
    return Response.json({error:'Dukascopy history unavailable or blocked; no synthetic fallback was used.'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
