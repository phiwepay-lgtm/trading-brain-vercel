// Experimental translation of the supplied Dark Orders defaults. Descriptive
// volume/price heuristics only: they do not observe dark pools or institutions.
// All calculations use completed, standard M5 OHLC and vendor-provided volume.
const BASE=50, SMOOTH=3, ATR=14;

export function calculateDarkOrders(m5) {
  const output=[];
  let volumes=[],sum=0,sumSquares=0,atr=null,trSeed=[],previousClose=null,haOpen=null,haClose=null,previousDirection=0,zEma=null,rvolEma=null,darkCount=0,previousTime=null;
  const reset=()=>{volumes=[];sum=0;sumSquares=0;atr=null;trSeed=[];previousClose=null;haOpen=null;haClose=null;previousDirection=0;zEma=null;rvolEma=null;darkCount=0;};
  for(const b of m5) {
    if(previousTime!==null && b.time-previousTime!==300) reset();
    previousTime=b.time;
    if(![b.open,b.high,b.low,b.close,b.volume].every(x=>typeof x==='number' && Number.isFinite(x)) || b.volume<0) {
      reset();output.push({time:b.time,type:'unknown'});continue;
    }
    const tr=previousClose===null ? b.high-b.low : Math.max(b.high-b.low,Math.abs(b.high-previousClose),Math.abs(b.low-previousClose));
    previousClose=b.close;
    if(atr===null) {trSeed.push(tr);if(trSeed.length===ATR)atr=trSeed.reduce((a,x)=>a+x,0)/ATR;}
    else atr=(atr*(ATR-1)+tr)/ATR;
    const nextHaClose=(b.open+b.high+b.low+b.close)/4;
    const nextHaOpen=haOpen===null?(b.open+b.close)/2:(haOpen+haClose)/2;
    haOpen=nextHaOpen;haClose=nextHaClose;
    const direction=haClose>haOpen?1:haClose<haOpen?-1:0;
    volumes.push(b.volume);sum+=b.volume;sumSquares+=b.volume*b.volume;
    if(volumes.length>BASE){const old=volumes.shift();sum-=old;sumSquares-=old*old;}
    if(volumes.length<BASE || atr===null || atr<=0){previousDirection=direction;output.push({time:b.time,type:'unknown'});continue;}
    const mean=sum/BASE,std=Math.sqrt(Math.max(0,sumSquares/BASE-mean*mean));
    if(mean<=0 || std<=0) {zEma=null;rvolEma=null;darkCount=0;previousDirection=direction;output.push({time:b.time,type:'unknown'});continue;}
    const z=(b.volume-mean)/std,rv=b.volume/mean,alpha=2/(SMOOTH+1);
    zEma=zEma===null?z:alpha*z+(1-alpha)*zEma;
    rvolEma=rvolEma===null?rv:alpha*rv+(1-alpha)*rvolEma;
    const range=(b.high-b.low)/atr, body=Math.abs(b.close-b.open)/atr;
    const anomaly=zEma>=2;
    const absorption=anomaly && range<0.5 && body<0.3;
    const ignitionBull=anomaly && range>1.2 && body>0.6 && direction===1 && b.close>b.open;
    const ignitionBear=anomaly && range>1.2 && body>0.6 && direction===-1 && b.close<b.open;
    const exhaustion=anomaly && range>1 && ((previousDirection===1 && direction===-1)||(previousDirection===-1 && direction===1));
    darkCount=rvolEma>=1.3 && range<0.8 ? darkCount+1 : 0;
    // Preserve supplied priority. The dark state persists after its first bar.
    const type=absorption?'absorption':ignitionBull||ignitionBear?'ignition':exhaustion?'exhaustion':darkCount>=3?'dark':'quiet';
    output.push({time:b.time,type,direction:ignitionBull?1:ignitionBear?-1:0,zScore:zEma,rvol:rvolEma,darkCount});
    previousDirection=direction;
  }
  return output;
}

function summarize(trades) {
  const wins=trades.filter(t=>t.r>0).length,losses=trades.filter(t=>t.r<0).length,netR=trades.reduce((sum,t)=>sum+t.r,0);
  const gain=trades.reduce((sum,t)=>sum+Math.max(0,t.r),0),loss=trades.reduce((sum,t)=>sum+Math.max(0,-t.r),0);
  return {closed:trades.length,wins,losses,netR,meanR:trades.length?netR/trades.length:null,winRate:trades.length?wins/trades.length:null,profitFactor:loss?gain/loss:null};
}

/** Compare subsets of the same already-simulated closed trades, not a new filtered backtest. */
export function compareDarkOrders(m5,result) {
  const signals=calculateDarkOrders(m5),byTime=new Map(signals.map(x=>[x.time,x]));
  const classify=trade=>{
    // M1 timestamp denotes open; the decision is at that bar's close. Only the
    // most recently completed M5 bucket may be used, never a stale/partial one.
    const close=trade.time+60,m5Start=Math.floor(close/300)*300-300;
    return byTime.get(m5Start)?.type || 'unknown';
  };
  const groups={matched:[],unmatched:[],unknown:[],absorption:[],ignition:[],exhaustion:[],dark:[]};
  for(const trade of result.trades) {
    const type=classify(trade);
    if(type==='unknown')groups.unknown.push(trade);
    else if(type==='quiet')groups.unmatched.push(trade);
    else {groups.matched.push(trade);groups[type].push(trade);}
  }
  const classified=[...groups.matched,...groups.unmatched];
  const outcome={allClosed:summarize(result.trades),available:summarize(classified)};
  for(const [key,trades] of Object.entries(groups))outcome[key]=summarize(trades);
  outcome.open=result.open?1:0;outcome.censored=result.censored.length;
  return outcome;
}
