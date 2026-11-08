// TODO PR13: WebRequest bridge - Read JSON from TV webhook (not implemented).
// Trading Brain M5/M1 visual scanner. NO order submission or network requests.
// The VLB/VHB markers are engulfing-at-extreme candidates, NOT confirmed BOS,
// CHoCH, pullback, continuation or verified BT/FTB patterns. Manual review only.
#property strict
#property version "1.10"

input bool Enable_Visual_Scanner = false; // OFF by default; visual annotations only
input bool Use_M5_Filter = true;
input int M5_Len = 50;
input int M1_Len = 5;
input int Zone_Points = 10; // arbitrary display half-width, not a stop or an FVG
input int History_Bars = 500; // visual backfill, capped at 1000 M1 bars

string prefix;
datetime lastM1=0;
bool backfilled=false;

void RemoveObjects() { ObjectsDeleteAll(0,prefix); }
void DeleteZones() { ObjectDelete(0,prefix+"BT"); ObjectDelete(0,prefix+"FTB"); }

// At the M1 bar's OPEN time, use the immediately preceding fully closed M5
// candle and M5_Len bars ending there. Reject gaps and insufficient history.
bool M5Levels(datetime m1Time,double &bt,double &ftb,int &bias,int &m5shift)
{
   m5shift=iBarShift(_Symbol,PERIOD_M5,m1Time,false);
   if(m5shift<0) return false;
   datetime bucket=iTime(_Symbol,PERIOD_M5,m5shift);
   if(bucket<=0 || m1Time<bucket || m1Time>=bucket+300) return false;
   int first=m5shift+1;
   if(Bars(_Symbol,PERIOD_M5)<first+M5_Len) return false;
   double hi=-DBL_MAX,lo=DBL_MAX;
   for(int i=first;i<first+M5_Len;i++)
   {
      double h=iHigh(_Symbol,PERIOD_M5,i),l=iLow(_Symbol,PERIOD_M5,i);
      if(h<=0 || l<=0 || h<l || iTime(_Symbol,PERIOD_M5,i)<=0) return false;
      hi=MathMax(hi,h); lo=MathMin(lo,l);
   }
   double c=iClose(_Symbol,PERIOD_M5,first);
   if(c<=0 || hi<=lo) return false;
   double range=hi-lo;
   bt=hi-range*0.382; ftb=lo+range*0.382;
   bias=c>bt ? -1 : c<ftb ? 1 : 0;
   return true;
}

bool Candidates(int shift,bool &vlb,bool &vhb)
{
   vlb=false; vhb=false;
   if(Bars(_Symbol,PERIOD_M1)<shift+M1_Len+1) return false;
   datetime time=iTime(_Symbol,PERIOD_M1,shift);
   double o=iOpen(_Symbol,PERIOD_M1,shift),c=iClose(_Symbol,PERIOD_M1,shift);
   double h=iHigh(_Symbol,PERIOD_M1,shift),l=iLow(_Symbol,PERIOD_M1,shift);
   double po=iOpen(_Symbol,PERIOD_M1,shift+1),pc=iClose(_Symbol,PERIOD_M1,shift+1);
   if(time<=0 || o<=0 || c<=0 || h<=0 || l<=0 || po<=0 || pc<=0) return false;
   double previousHigh=-DBL_MAX,previousLow=DBL_MAX;
   for(int i=1;i<=M1_Len;i++)
   {
      datetime prior=iTime(_Symbol,PERIOD_M1,shift+i);
      double ph=iHigh(_Symbol,PERIOD_M1,shift+i),pl=iLow(_Symbol,PERIOD_M1,shift+i);
      if(prior<=0 || time-prior!=i*60 || ph<=0 || pl<=0 || ph<pl) return false;
      previousHigh=MathMax(previousHigh,ph); previousLow=MathMin(previousLow,pl);
   }
   vlb=c<o && pc>po && o>=pc && c<=po && h>=previousHigh;
   vhb=c>o && pc<po && o<=pc && c>=po && l<=previousLow;
   return true;
}

void Marker(datetime time,double price,bool sell)
{
   string name=prefix+(sell ? "VLB_" : "VHB_")+(string)time;
   if(ObjectFind(0,name)<0 && ObjectCreate(0,name,OBJ_ARROW,0,time,price))
   {
      ObjectSetInteger(0,name,OBJPROP_ARROWCODE,sell ? 234 : 233);
      ObjectSetInteger(0,name,OBJPROP_COLOR,sell ? clrRed : clrLimeGreen);
      ObjectSetInteger(0,name,OBJPROP_WIDTH,2);
      ObjectSetString(0,name,OBJPROP_TOOLTIP,sell ? "VLB? sell candidate - heuristic, not confirmed" : "VHB? buy candidate - heuristic, not confirmed");
   }
}
void Zone(string name,datetime left,datetime right,double level,color shade)
{
   name=prefix+name;
   double pad=Zone_Points*_Point;
   if(ObjectFind(0,name)<0) ObjectCreate(0,name,OBJ_RECTANGLE,0,left,level+pad,right,level-pad);
   else { ObjectMove(0,name,0,left,level+pad); ObjectMove(0,name,1,right,level-pad); }
   ObjectSetInteger(0,name,OBJPROP_COLOR,shade);
   ObjectSetInteger(0,name,OBJPROP_FILL,false); // outlined; MT5 object alpha varies by terminal
   ObjectSetInteger(0,name,OBJPROP_BACK,true);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
}
void ProcessBar(int shift)
{
   bool vlb,vhb;
   if(!Candidates(shift,vlb,vhb)) return;
   datetime t=iTime(_Symbol,PERIOD_M1,shift);
   double bt=0,ftb=0; int bias=0,m5shift=0;
   bool m5ok=M5Levels(t,bt,ftb,bias,m5shift);
   if(vlb && (!Use_M5_Filter || (m5ok && bias==-1))) Marker(t,iHigh(_Symbol,PERIOD_M1,shift)+5*_Point,true);
   if(vhb && (!Use_M5_Filter || (m5ok && bias==1))) Marker(t,iLow(_Symbol,PERIOD_M1,shift)-5*_Point,false);
}
int OnInit()
{
   prefix="TradingBrain_MTF_"+(string)ChartID()+"_";
   if(M5_Len<2 || M5_Len>1000 || M1_Len<1 || M1_Len>100 || Zone_Points<1 || Zone_Points>1000 || History_Bars<0 || History_Bars>1000) return INIT_PARAMETERS_INCORRECT;
   return INIT_SUCCEEDED;
}
void OnDeinit(const int reason) { RemoveObjects(); Comment(""); }
void OnTick()
{
   if(!Enable_Visual_Scanner || Period()!=PERIOD_M1)
   {
      RemoveObjects(); backfilled=false; lastM1=0;
      Comment("Trading Brain: HOLD / visual scanner ",Enable_Visual_Scanner ? "requires M1 chart" : "disabled", ". No orders.");
      return;
   }
   datetime current=iTime(_Symbol,PERIOD_M1,0),closed=iTime(_Symbol,PERIOD_M1,1);
   if(current<=0 || closed<=0) { DeleteZones(); Comment("Trading Brain: HOLD - M1 data unavailable."); return; }
   if(current==lastM1) return;
   double bt=0,ftb=0;int bias=0,m5shift=0;
   // The last closed M1 bar determines both candidate and aligned M5 value.
   bool m5ok=M5Levels(closed,bt,ftb,bias,m5shift),vlb=false,vhb=false;
   bool m1ok=Candidates(1,vlb,vhb);
   if(!m1ok || (!m5ok && Use_M5_Filter)) { DeleteZones(); Comment("Trading Brain: HOLD - waiting for complete M1/M5 history."); return; }
   if(!backfilled)
   {
      int count=MathMin(History_Bars,Bars(_Symbol,PERIOD_M1)-M1_Len-1);
      for(int i=count;i>=1;i--) ProcessBar(i);
      if(count<1) ProcessBar(1); // History_Bars=0 still evaluates the latest closed bar.
      backfilled=true;
   }
   else ProcessBar(1);
   lastM1=current;
   if(m5ok)
   {
      datetime left=iTime(_Symbol,PERIOD_M5,m5shift+M5_Len);
      Zone("BT",left,current,bt,clrFireBrick); Zone("FTB",left,current,ftb,clrSeaGreen);
   }
   else DeleteZones();
   string state=m5ok ? (bias<0 ? "BEARISH / BT proxy" : bias>0 ? "BULLISH / FTB proxy" : "NEUTRAL") : "UNAVAILABLE";
   bool sell=vlb && (!Use_M5_Filter || (m5ok && bias<0));
   bool buy=vhb && (!Use_M5_Filter || (m5ok && bias>0));
   string marker=sell ? "VLB? SELL candidate" : buy ? "VHB? BUY candidate" : "HOLD";
   Comment("Trading Brain - visual only, no orders\nM5: ",state,"\nM1: ",marker,"\nM5 filter: ",Use_M5_Filter ? "ON" : "OFF", "\nEngulfing proxy; manual validation required.");
   ChartRedraw();
}
