import { parseMarketCSV, historyQuality, MAX_HISTORY_BYTES, MAX_HISTORY_ROWS } from '../../lib/strategy/history.mjs';
import { runResearchTester } from '../../lib/strategy/tester.mjs';
import { buildM5 } from '../../lib/strategy/history.mjs';
import { compareDarkOrders } from '../../lib/strategy/dark-orders.mjs';
import { runProV1Research } from '../../lib/strategy/pro-v1-research.mjs';

const ctx: any = self;
let bars: any[] = [];
ctx.onmessage = async (event: MessageEvent) => {
  const {type} = event.data;
  try {
    if(type==='load') {
      bars=[];
      const file=event.data.file as File;
      if(file.size>MAX_HISTORY_BYTES) throw new Error('File exceeds the 128 MiB browser import limit. Use a shorter period.');
      ctx.postMessage({type:'progress',message:'Reading and validating history locally…'});
      const parsed=parseMarketCSV(await file.text(),{assumeUTC:event.data.assumeUTC});
      bars=parsed;
      ctx.postMessage({type:'loaded',name:file.name,quality:historyQuality(bars)});
    } else if(type==='provider') {
      bars=[];
      const {symbol,source,startTime,endTime,token}=event.data;
      if (!['XAUUSD','EURUSD','BTCUSD'].includes(symbol) || !['twelvedata','binance','demo','dukascopy'].includes(source) || !Number.isSafeInteger(startTime) || !Number.isSafeInteger(endTime) || startTime>=endTime) throw new Error('Select a valid source, symbol and UTC date range.');
      const startWithWarmup=Math.max(60,startTime-7*86400), pages:any[]=[];
      let before=endTime, partial='', sourceName='',emptyDays=0;
      if(source==='dukascopy') {
        let day=Math.floor(startWithWarmup/86400)*86400, lastDay=Math.min(endTime,Math.floor(Date.now()/1000));
        while(day<lastDay) {
          const dayLabel=new Date(day*1000).toISOString().slice(0,10);
          ctx.postMessage({type:'progress',message:`Fetching Dukascopy BID M1 for ${dayLabel}…`});
          const query=new URLSearchParams({symbol,day:dayLabel});
          const res=await fetch(`/api/tester/dukascopy?${query}`,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store'});
          if(!res.ok || res.headers.get('X-Chart-Source')!=='dukascopy') throw new Error(`Dukascopy failed on ${dayLabel}. No partial history was loaded; retry or import a verified CSV.`);
          sourceName=res.headers.get('X-Chart-Instrument') || symbol;
          const data=await res.json();if(!Array.isArray(data))throw new Error('Dukascopy returned invalid data.');
          if(!data.length)emptyDays++;
          if(pages.length+data.length>MAX_HISTORY_ROWS)throw new Error('The requested range exceeds the 2 million candle browser limit; use a shorter range. No data was silently cut.');
          pages.push(...data);day+=86400;
        }
      } else {
        let page=0;
        while(before>startWithWarmup) {
          page++;
          ctx.postMessage({type:'progress',message:`Fetching ${source} M1 history: page ${page}…`});
          const query=new URLSearchParams({symbol,timeframe:'M1',source,before:String(before)});
          const res=await fetch(`/api/chart/candles?${query}`,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store'});
          if(!res.ok || res.headers.get('X-Chart-Source')!==source) throw new Error('Provider unavailable or rate limit reached. No partial history was loaded; retry or import CSV.');
          sourceName=res.headers.get('X-Chart-Instrument') || symbol;
          const data=await res.json();if(!Array.isArray(data))throw new Error('Provider returned invalid data');
          const rows=data.filter((b:any)=>Number.isSafeInteger(b.time) && b.time%60===0 && b.time<before && b.time+60<=Math.floor(Date.now()/1000)).sort((a:any,b:any)=>a.time-b.time);
          if(!rows.length){partial='Provider returned no more earlier candles; requested coverage may be incomplete.';break;}
          if(pages.length+rows.length>MAX_HISTORY_ROWS)throw new Error('The requested range exceeds the 2 million candle browser limit; use a shorter range. No data was silently cut.');
          pages.push(...rows);const oldest=rows[0].time;
          if(oldest<=startWithWarmup) break;
          if(oldest>=before)throw new Error('Provider did not advance to earlier history. No partial history was loaded.');
          before=oldest;
          if(source==='twelvedata') await new Promise(resolve=>setTimeout(resolve,10000));
        }
      }
      if(!pages.length)throw new Error('The requested provider returned no history.');
      const unique=new Map<number,any>();for(const b of pages)if(b.time>=startWithWarmup && b.time<endTime)unique.set(b.time,b);
      const parsed=[...unique.values()].sort((a,b)=>a.time-b.time);
      if(!parsed.some(b=>b.time>=startTime && b.time<endTime)) throw new Error('No provider candles are available in the selected range.');
      bars=parsed;
      if(bars[0].time>startWithWarmup && !partial)partial='Warm-up history is shorter than requested.';
      if(emptyDays)partial+=(partial?' ':'')+`${emptyDays} UTC day(s) returned no bars; this may be a market closure or missing history. Coverage cannot be independently verified.`;
      ctx.postMessage({type:'loaded',name:`${sourceName} · ${source.toUpperCase()}`,quality:historyQuality(bars),partial,range:{startTime,endTime}});
    } else if(type==='run') {
      if(!bars.length) throw new Error('Import M1 market history first.');
      ctx.postMessage({type:'progress',message:'Running closed-bar research replay…'});
      const result: any=runResearchTester(bars,event.data.params,event.data.options);
      if(event.data.darkOrders) {
        ctx.postMessage({type:'progress',message:'Comparing completed M5 volume confluence…'});
        const history=event.data.options.endTime===null?bars:bars.filter((b:any)=>b.time<event.data.options.endTime);
        const m5=buildM5(history).bars;
        result.darkOrders=compareDarkOrders(m5,result);
        ctx.postMessage({type:'progress',message:'Comparing independent-position Pro V1 research…'});
        const pro=runProV1Research(history,event.data.params,{startTime:event.data.options.startTime,endTime:event.data.options.endTime});
        result.darkOrdersPro=compareDarkOrders(m5,{trades:pro.positions.closed,open:pro.positions.open.length?true:null,censored:pro.positions.censored});
        result.darkOrdersPro.open=pro.positions.open.length;
        result.darkOrdersPro.invalid=pro.positions.invalidSignals;
      }
      ctx.postMessage({type:'result',result});
    } else if(type==='view') {
      if(!bars.length) return;
      const time=event.data.time as number;let lo=0,hi=bars.length;
      while(lo<hi){const mid=(lo+hi)>>1;if(bars[mid].time<time)lo=mid+1;else hi=mid;}
      const from=Math.max(0,Math.min(bars.length-1,lo)-100);
      ctx.postMessage({type:'view',bars:bars.slice(from,Math.min(bars.length,from+250)),trade:event.data.trade || null});
    }
  } catch(error) {ctx.postMessage({type:'error',message:error instanceof Error?error.message:'Unknown tester error'});}
};
