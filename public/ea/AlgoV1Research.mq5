#property strict
#property version "1.00"
#property description "Algo V1 unverified research indicator. Standard M1 only; no orders."
#property indicator_chart_window
#property indicator_buffers 12
#property indicator_plots 12
#property indicator_label1 "Buy candidate"
#property indicator_type1 DRAW_ARROW
#property indicator_color1 clrLime
#property indicator_label2 "Sell candidate"
#property indicator_type2 DRAW_ARROW
#property indicator_color2 clrRed
#property indicator_label3 "M1 pivot high (back-plotted)"
#property indicator_type3 DRAW_ARROW
#property indicator_color3 clrTomato
#property indicator_label4 "M1 pivot low (back-plotted)"
#property indicator_type4 DRAW_ARROW
#property indicator_color4 clrLimeGreen
#property indicator_label5 "Virtual entry"
#property indicator_type5 DRAW_LINE
#property indicator_color5 clrAqua
#property indicator_label6 "Virtual stop"
#property indicator_type6 DRAW_LINE
#property indicator_color6 clrRed
#property indicator_label7 "Virtual target"
#property indicator_type7 DRAW_LINE
#property indicator_color7 clrLime
#property indicator_label8 "M5 HA high confirmation"
#property indicator_type8 DRAW_ARROW
#property indicator_color8 clrMagenta
#property indicator_label9 "M5 HA low confirmation"
#property indicator_type9 DRAW_ARROW
#property indicator_color9 clrDodgerBlue
#property indicator_label10 "M5 HA 0.382"
#property indicator_type10 DRAW_LINE
#property indicator_color10 clrOrange
#property indicator_label11 "Confirmed structure exit level"
#property indicator_type11 DRAW_LINE
#property indicator_color11 clrYellow
#property indicator_label12 "Virtual structure exit"
#property indicator_type12 DRAW_ARROW
#property indicator_color12 clrYellow
#include <AlgoV1Core.mqh>
input int PivotLeft=2;
input int PivotRight=2;
input int M5Expiry=48;
input int M1Expiry=240;
input int StopBufferTicks=10;
enum AlgoMode { BOTH=0, CONTINUATION=1, FTB=2 };
input AlgoMode Mode=BOTH;
enum AlgoTP { TP_2=2, TP_3=3, TP_4=4, TP_5=5, TP_7=7 };
input AlgoTP TargetR=TP_3;
enum AlgoBE { BE_OFF=0, BE_2=2, BE_3=3 };
input AlgoBE BreakevenR=BE_OFF;
input bool UseStructureExit=true;
input int HistoryM1=5000;
double buys[],sells[],pivotHi[],pivotLo[],entry[],stop[],target[],m5Hi[],m5Lo[],fib[],protectedLine[],structureExit[];
int OnInit() {
   if(_Period!=PERIOD_M1 || PivotLeft<1 || PivotRight<1 || PivotLeft>20 || PivotRight>20 || M5Expiry<1 || M1Expiry<1 || StopBufferTicks<0 || HistoryM1<100 || HistoryM1>50000) { Print("Algo V1: use M1 and valid inputs."); return INIT_PARAMETERS_INCORRECT; }
   SetIndexBuffer(0,buys,INDICATOR_DATA); SetIndexBuffer(1,sells,INDICATOR_DATA); SetIndexBuffer(2,pivotHi,INDICATOR_DATA); SetIndexBuffer(3,pivotLo,INDICATOR_DATA);
   SetIndexBuffer(4,entry,INDICATOR_DATA); SetIndexBuffer(5,stop,INDICATOR_DATA); SetIndexBuffer(6,target,INDICATOR_DATA);
   SetIndexBuffer(7,m5Hi,INDICATOR_DATA); SetIndexBuffer(8,m5Lo,INDICATOR_DATA); SetIndexBuffer(9,fib,INDICATOR_DATA);
   SetIndexBuffer(10,protectedLine,INDICATOR_DATA); SetIndexBuffer(11,structureExit,INDICATOR_DATA);
   for(int i=0;i<12;i++) PlotIndexSetDouble(i,PLOT_EMPTY_VALUE,EMPTY_VALUE);
   PlotIndexSetInteger(0,PLOT_ARROW,233); PlotIndexSetInteger(1,PLOT_ARROW,234); PlotIndexSetInteger(2,PLOT_ARROW,159); PlotIndexSetInteger(3,PLOT_ARROW,159); PlotIndexSetInteger(7,PLOT_ARROW,159); PlotIndexSetInteger(8,PLOT_ARROW,159); PlotIndexSetInteger(11,PLOT_ARROW,251);
   IndicatorSetString(INDICATOR_SHORTNAME,"Algo V1 RESEARCH - unverified"); return INIT_SUCCEEDED;
}
int OnCalculate(const int rates_total,const int prev_calculated,const datetime &time[],const double &open[],const double &high[],const double &low[],const double &close[],const long &tick_volume[],const long &volume[],const int &spread[]) {
   static datetime lastBar=0; datetime current=iTime(_Symbol,PERIOD_M1,0);
   if(prev_calculated>0 && lastBar==current) return rates_total; lastBar=current;
   ArraySetAsSeries(buys,false); ArraySetAsSeries(sells,false); ArraySetAsSeries(pivotHi,false); ArraySetAsSeries(pivotLo,false); ArraySetAsSeries(entry,false); ArraySetAsSeries(stop,false); ArraySetAsSeries(target,false); ArraySetAsSeries(m5Hi,false); ArraySetAsSeries(m5Lo,false); ArraySetAsSeries(fib,false); ArraySetAsSeries(protectedLine,false); ArraySetAsSeries(structureExit,false);
   ArrayInitialize(buys,EMPTY_VALUE); ArrayInitialize(sells,EMPTY_VALUE); ArrayInitialize(pivotHi,EMPTY_VALUE); ArrayInitialize(pivotLo,EMPTY_VALUE); ArrayInitialize(entry,EMPTY_VALUE); ArrayInitialize(stop,EMPTY_VALUE); ArrayInitialize(target,EMPTY_VALUE); ArrayInitialize(m5Hi,EMPTY_VALUE); ArrayInitialize(m5Lo,EMPTY_VALUE); ArrayInitialize(fib,EMPTY_VALUE); ArrayInitialize(protectedLine,EMPTY_VALUE); ArrayInitialize(structureExit,EMPTY_VALUE);
   MqlRates m1[],m5[]; ArraySetAsSeries(m1,false); ArraySetAsSeries(m5,false);
   int wanted=MathMin(rates_total,HistoryM1);
   int n=CopyRates(_Symbol,PERIOD_M1,0,wanted,m1); int n5=CopyRates(_Symbol,PERIOD_M5,0,MathMax(2000,wanted/5+300),m5);
   AlgoHA ha[]; AlgoResult results[]; double tick=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   if(n<=0 || n5<=0 || !AlgoBuildHA(m5,ha) || !AlgoReplay(m1,ha,PivotLeft,PivotRight,M5Expiry,M1Expiry,(int)Mode,tick,StopBufferTicks,(double)TargetR,(double)BreakevenR,UseStructureExit,results)) { Print("Algo V1: insufficient history or tick size."); return 0; }
   int offset=rates_total-n;
   for(int i=0;i<n-1;i++) {
      int k=offset+i; if(k<0 || k>=rates_total) continue;
      if(results[i].buy) buys[k]=m1[i].low; if(results[i].sell) sells[k]=m1[i].high;
      if(results[i].m1High && k>=PivotRight) pivotHi[k-PivotRight]=results[i].pivotHigh;
      if(results[i].m1Low && k>=PivotRight) pivotLo[k-PivotRight]=results[i].pivotLow;
      if(results[i].m5High) m5Hi[k]=results[i].m5PivotHigh; if(results[i].m5Low) m5Lo[k]=results[i].m5PivotLow;
      if(results[i].fib!=0) fib[k]=results[i].fib;
      if(results[i].protectedPivot!=0) protectedLine[k]=results[i].protectedPivot;
      if(results[i].structureExit) structureExit[k]=m1[i].close;
      if(results[i].entry!=0) { entry[k]=results[i].entry; stop[k]=results[i].stop; target[k]=results[i].target; }
   }
   return rates_total;
}
