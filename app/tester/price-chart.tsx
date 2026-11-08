'use client';
import { useEffect, useRef } from 'react';
import { ColorType, createChart, LineStyle, type UTCTimestamp } from 'lightweight-charts';

type Bar = {time:number;open:number;high:number;low:number;close:number};
type Trade = {time:number;exitTime:number;direction:number;stop:number;target:number;entryFill:number;exit:number};
export default function PriceChart({bars,trade}:{bars:Bar[];trade:Trade|null}) {
  const el=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!el.current || !bars.length)return;
    const chart=createChart(el.current,{autoSize:true,layout:{background:{type:ColorType.Solid,color:'#101925'},textColor:'#9aacc0'},grid:{vertLines:{color:'#1b2938'},horzLines:{color:'#1b2938'}},timeScale:{timeVisible:true,borderColor:'#334558'}});
    const series=chart.addCandlestickSeries({upColor:'#41d4af',downColor:'#f17b85',wickUpColor:'#41d4af',wickDownColor:'#f17b85',borderVisible:false});
    series.setData(bars as any);
    if(trade) {
      const times=new Set(bars.map(b=>b.time));
      const markers:any[]=[];
      if(times.has(trade.time))markers.push({time:trade.time as UTCTimestamp,position:trade.direction===1?'belowBar':'aboveBar',color:'#e9c770',shape:trade.direction===1?'arrowUp':'arrowDown',text:'Entry'});
      if(times.has(trade.exitTime))markers.push({time:trade.exitTime as UTCTimestamp,position:trade.direction===1?'aboveBar':'belowBar',color:'#9ab9ff',shape:'circle',text:'Exit'});
      series.setMarkers(markers.sort((a,b)=>a.time-b.time));
      series.createPriceLine({price:trade.stop,color:'#f17b85',lineWidth:1,lineStyle:LineStyle.Dashed,axisLabelVisible:true,title:'Stop'});
      series.createPriceLine({price:trade.target,color:'#41d4af',lineWidth:1,lineStyle:LineStyle.Dashed,axisLabelVisible:true,title:'Target'});
    }
    chart.timeScale().fitContent();return ()=>chart.remove();
  },[bars,trade]);
  return <div className="tester-price-chart" ref={el} aria-label="M1 price chart around selected trade"/>;
}
