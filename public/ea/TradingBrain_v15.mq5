// TradingBrain v15 - BT/FTB research draft; NOT compiled or broker-verified.
// No live/demo orders: CTrade is hard-restricted to the Strategy Tester and
// requires explicit opt-in. The website and legacy MT5 scanner remain HOLD.
// Pivot/HA initialization, session clock, execution timing and fills can differ
// from Pine. Do not use this source as a verified translation or performance.
#property strict
#property version "15.00"
#property description "BT/FTB research draft; tester-only orders; uncompiled."
#include <Trade/Trade.mqh>
#define TB_TESTER_VISUALS false

input bool Enable_Simulation = false;
input bool Sessions_Confirmed = false;
input bool Broker_UTC_Offset_Confirmed = false;
input int Broker_UTC_Offset_Minutes = 0; // Broker bar-time minus UTC; user must confirm for ALL tested dates.
input bool Enable_StrategyTester_Orders = false; // Disabled by default, cannot place live/demo orders.
input bool Use_FTB = true;
input bool Require_HA_Color_Shift = true;
input int FTB_Proximity_Ticks = 10;
input int Fib_Tolerance_Ticks = 10;
input double RR_Ratio = 2.5;
input double Engulf_Multiplier = 1.2;
input int Stop_Buffer_Ticks = 10;
input double Order_Quantity = 0.01; // MT5 lots, NOT Pine contracts/units.
input int M5_Lookback = 50;
input int M5_Left = 2;
input int M5_Right = 2;
input int M1_Left = 2;
input int M1_Right = 2;
input long Magic_Number = 150015;

CTrade trade;
enum State { NO_SESSION, EXPECTING_BOS, BT_FOUND, FTB_FOUND, WAITING_ANCHORS, WAITING_0382, WAITING_CHOCH, CHOCH_FOUND, ENTRY_SIGNAL, AMBIGUOUS };
State state = NO_SESSION;
struct HA { datetime time; double open, high, low, close; };
struct Pivot { bool valid; int idx; datetime time; double value; };
datetime lastM1Open=0, usedHigh=0, usedLow=0, usedFtbHigh=0, usedFtbLow=0;
datetime bosTime=0, reactionTime=0, chochTime=0;
int direction=0;
string setupType="NONE";
double fib=0, chochLevel=0, failedLevel=0;
bool hadPosition=false;

bool ValidInputs() {
   return M5_Lookback>=2 && M5_Left>=1 && M5_Right>=1 && M1_Left>=1 && M1_Right>=1 &&
      M5_Left<=50 && M5_Right<=50 && M1_Left<=50 && M1_Right<=50 && M5_Lookback<=1000 &&
      FTB_Proximity_Ticks>=0 && Fib_Tolerance_Ticks>=0 && Stop_Buffer_Ticks>=0 &&
      RR_Ratio>0 && Engulf_Multiplier>=1 && Order_Quantity>0 &&
      Broker_UTC_Offset_Minutes>=-840 && Broker_UTC_Offset_Minutes<=840;
}
// UTC transition instants for America/New_York. Broker offset is an explicit,
// fixed user input and is NOT automatically adjusted for broker DST/history.
datetime NthSundayUtc(int year,int month,int nth,int hour) {
   MqlDateTime d={}; d.year=year; d.mon=month; d.day=1; d.hour=hour;
   datetime first=StructToTime(d); MqlDateTime x={}; TimeToStruct(first,x);
   int day=1+((7-x.day_of_week)%7)+7*(nth-1); d.day=day; return StructToTime(d);
}
bool GoldenSession(datetime brokerBarTime) {
   if(!Sessions_Confirmed || !Broker_UTC_Offset_Confirmed) return false;
   datetime utc=brokerBarTime-(datetime)(Broker_UTC_Offset_Minutes*60);
   MqlDateTime u={}; TimeToStruct(utc,u);
   bool dst=utc>=NthSundayUtc(u.year,3,2,7) && utc<NthSundayUtc(u.year,11,1,6);
   MqlDateTime ny={}; TimeToStruct(utc-(dst?4:5)*3600,ny);
   int nyMinute=ny.hour*60+ny.min, utcMinute=u.hour*60+u.min;
   return (nyMinute>=570 && nyMinute<960) || (utcMinute>=60 && utcMinute<360);
}
// Use SYMBOL_TRADE_TICK_SIZE, not _Point: price precision and broker volumes
// can differ from TradingView; confirm broker data before interpreting signals.
double TickSize() { double tick=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE); return tick; }
double RoundTick(double x,double tick) { return NormalizeDouble(MathRound(x/tick)*tick,_Digits); }

bool BuildHA(MqlRates &bars[],int n,HA &ha[]) {
   if(n<4) return false;
   ArrayResize(ha,n);
   for(int i=0;i<n;i++) {
      ha[i].time=bars[i].time;
      ha[i].close=(bars[i].open+bars[i].high+bars[i].low+bars[i].close)/4.0;
      ha[i].open=(i==0 ? (bars[i].open+bars[i].close)/2.0 : (ha[i-1].open+ha[i-1].close)/2.0);
      ha[i].high=MathMax(bars[i].high,MathMax(ha[i].open,ha[i].close));
      ha[i].low=MathMin(bars[i].low,MathMin(ha[i].open,ha[i].close));
   }
   return true;
}
// Confirmed pivots: bars after pivot must already exist. Tie handling and HA
// seeding are provisional and require cross-platform chart/replay validation.
Pivot PivotHA(HA &a[],int end,int left,int right,int rank,bool high) {
   Pivot p={}; int found=0;
   for(int i=end-right;i>=left;i--) {
      double v=high?a[i].high:a[i].low; bool ok=true;
      for(int j=1;j<=left && ok;j++) if(high ? v<=a[i-j].high : v>=a[i-j].low) ok=false;
      for(int j=1;j<=right && ok;j++) if(high ? v<a[i+j].high : v>a[i+j].low) ok=false;
      if(ok) { if(found==rank) { p.valid=true; p.idx=i; p.time=a[i].time; p.value=v; return p; } found++; }
   }
   return p;
}
Pivot PivotM1(MqlRates &a[],int end,int left,int right,int rank,bool high) {
   Pivot p={}; int found=0;
   for(int i=end-right;i>=left;i--) {
      double v=high?a[i].high:a[i].low; bool ok=true;
      for(int j=1;j<=left && ok;j++) if(high ? v<=a[i-j].high : v>=a[i-j].low) ok=false;
      for(int j=1;j<=right && ok;j++) if(high ? v<a[i+j].high : v>a[i+j].low) ok=false;
      if(ok) { if(found==rank) { p.valid=true; p.idx=i; p.time=a[i].time; p.value=v; return p; } found++; }
   }
   return p;
}
bool Fresh(const Pivot &p,int end) { return p.valid && end-p.idx<=M5_Lookback; }
void ResetSetup() { direction=0; setupType="NONE"; fib=0; chochLevel=0; failedLevel=0; bosTime=0; reactionTime=0; chochTime=0; }
void DrawMarker(string label,datetime when,double price,color c,bool up) {
   if(!TB_TESTER_VISUALS || !MQLInfoInteger(MQL_TESTER) || !MQLInfoInteger(MQL_VISUAL_MODE)) return;
   string name="TBV15_"+label+"_"+IntegerToString((long)when);
   if(ObjectCreate(0,name,up?OBJ_ARROW_BUY:OBJ_ARROW_SELL,0,when,price)) {
      ObjectSetInteger(0,name,OBJPROP_COLOR,c); ObjectSetString(0,name,OBJPROP_TOOLTIP,label+" candidate (unverified)");
   }
}
void DrawLevel(string label,double price,color c) {
   if(!TB_TESTER_VISUALS || !MQLInfoInteger(MQL_TESTER) || !MQLInfoInteger(MQL_VISUAL_MODE) || price<=0) return;
   string name="TBV15_"+label;
   if(ObjectFind(0,name)<0) ObjectCreate(0,name,OBJ_HLINE,0,0,price);
   ObjectSetDouble(0,name,OBJPROP_PRICE,price); ObjectSetInteger(0,name,OBJPROP_COLOR,c);
}
bool HasPosition() { return PositionSelect(_Symbol); }
// Order placement is hard-gated to Strategy Tester, separately from detection.
// Market order is submitted on the first tick after the M1 signal bar closes;
// broker emulation, spread, gaps, stop distances and fills differ from Pine.
bool TesterOrder(bool buy,double signalClose,double stop,double tick) {
   if(!MQLInfoInteger(MQL_TESTER) || !Enable_StrategyTester_Orders) return false;
   double risk=buy?signalClose-stop:stop-signalClose;
   double target=RoundTick(buy?signalClose+risk*RR_Ratio:signalClose-risk*RR_Ratio,tick);
   double minLot=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN), maxLot=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX);
   double step=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   if(risk<=0 || stop<=0 || target<=0 || step<=0 || Order_Quantity<minLot || Order_Quantity>maxLot) return false;
   double steps=Order_Quantity/step;
   if(MathAbs(steps-MathRound(steps))>1e-8) return false;
   bool sent=buy?trade.Buy(Order_Quantity,_Symbol,0,stop,target,"TBv15 research"):trade.Sell(Order_Quantity,_Symbol,0,stop,target,"TBv15 research");
   if(!sent || (trade.ResultRetcode()!=TRADE_RETCODE_DONE && trade.ResultRetcode()!=TRADE_RETCODE_PLACED)) {
      Print("TB v15 tester order rejected, retcode=",trade.ResultRetcode()); return false;
   }
   return true;
}

void ProcessClosedM1() {
   if(!Enable_Simulation || _Period!=PERIOD_M1) { state=NO_SESSION; ResetSetup(); return; }
   MqlRates m1[]; ArraySetAsSeries(m1,false);
   int n1=CopyRates(_Symbol,PERIOD_M1,1,2000,m1);
   if(n1<MathMax(4,M1_Left+M1_Right+4)) return;
   int k=n1-1; datetime t=m1[k].time; double tick=TickSize();
   if(tick<=0) return;
   if(!GoldenSession(t)) { state=NO_SESSION; ResetSetup(); hadPosition=HasPosition(); return; }
   bool position=HasPosition();
   if(position) { state=ENTRY_SIGNAL; hadPosition=true; return; }
   if(hadPosition) { hadPosition=false; state=EXPECTING_BOS; ResetSetup(); return; }
   if(state==NO_SESSION || state==ENTRY_SIGNAL) state=EXPECTING_BOS;

   // Signal M5 is last closed bar, processed after the FIRST M1 of the next M5.
   datetime currentM5=iTime(_Symbol,PERIOD_M5,0);
   bool newM5=(currentM5>0 && t==currentM5);
   bool bullBos=false,bearBos=false,failedHigh=false,failedLow=false;
   double bLow=0,bHigh=0,proposedFailure=0;
   if(newM5) {
      MqlRates m5[]; ArraySetAsSeries(m5,false);
      int n5=CopyRates(_Symbol,PERIOD_M5,1,1500,m5);
      HA a[];
      if(n5<M5_Lookback+M5_Left+M5_Right+4 || !BuildHA(m5,n5,a)) return;
      int e=n5-1;
      Pivot hi=PivotHA(a,e,M5_Left,M5_Right,0,true), lo=PivotHA(a,e,M5_Left,M5_Right,0,false);
      Pivot phi=PivotHA(a,e,M5_Left,M5_Right,1,true), plo=PivotHA(a,e,M5_Left,M5_Right,1,false);
      Pivot eh=PivotHA(a,e-1,M5_Left,M5_Right,0,true), el=PivotHA(a,e-1,M5_Left,M5_Right,0,false);
      Pivot eph=PivotHA(a,e-1,M5_Left,M5_Right,1,true), epl=PivotHA(a,e-1,M5_Left,M5_Right,1,false);
      bool bearStructure=Fresh(lo,e) && Fresh(hi,e) && Fresh(plo,e) && Fresh(phi,e) && plo.value>lo.value && hi.value<phi.value && hi.idx>lo.idx;
      bullBos=Fresh(hi,e) && a[e].close>hi.value && usedHigh!=hi.time;
      bearBos=bearStructure && a[e].close<lo.value && usedLow!=lo.time;
      bool expectHigh=Fresh(eh,e) && eph.valid && eh.value>eph.value;
      bool expectLow=Fresh(el,e) && epl.valid && el.value<epl.value;
      double tolerance=FTB_Proximity_Ticks*tick;
      failedHigh=Use_FTB && expectHigh && a[e].high>=eh.value-tolerance && a[e].close<eh.value && a[e].close<a[e].open && (!Require_HA_Color_Shift || a[e-1].close>a[e-1].open) && usedHigh!=eh.time && usedFtbHigh!=eh.time;
      failedLow=Use_FTB && expectLow && a[e].low<=el.value+tolerance && a[e].close>el.value && a[e].close>a[e].open && (!Require_HA_Color_Shift || a[e-1].close<a[e-1].open) && usedLow!=el.time && usedFtbLow!=el.time;
      int count=(bullBos?1:0)+(bearBos?1:0)+(failedHigh?1:0)+(failedLow?1:0);
      if(count>0) {
         if(bullBos) usedHigh=hi.time; if(bearBos) usedLow=lo.time;
         if(failedHigh) usedFtbHigh=eh.time; if(failedLow) usedFtbLow=el.time;
         ResetSetup(); bosTime=t;
         if(count!=1) { state=AMBIGUOUS; return; }
         direction=(bullBos || failedLow)?1:-1;
         setupType=(bullBos || bearBos)?"BT":"FTB";
         if(setupType=="FTB") {
            failedLevel=failedHigh?eh.value:el.value; reactionTime=t; state=FTB_FOUND;
            DrawMarker("FTB",t,failedLevel,clrMagenta,direction==1); DrawLevel("FTB",failedLevel,clrMagenta);
         } else {
            bLow=direction==1?(Fresh(lo,e)?lo.value:0):a[e].low;
            bHigh=direction==1?a[e].high:(Fresh(plo,e)?plo.value:0);
            if(bLow<=0 || bHigh<=bLow) { state=WAITING_ANCHORS; return; }
            fib=direction==1?bHigh-(bHigh-bLow)*0.382:bLow+(bHigh-bLow)*0.382;
            state=BT_FOUND; DrawLevel("Fib",fib,clrOrange);
         }
         return; // do not infer intrabar ordering on the signal candle
      }
   }
   if(state==FTB_FOUND && t>bosTime) state=WAITING_CHOCH;
   if(state==BT_FOUND && t>bosTime) state=WAITING_0382;
   if(state==WAITING_0382 && t>bosTime && m1[k].low<=fib && m1[k].high>=fib) { state=WAITING_CHOCH; reactionTime=t; }
   Pivot h=PivotM1(m1,k,M1_Left,M1_Right,0,true), ph=PivotM1(m1,k,M1_Left,M1_Right,1,true);
   Pivot l=PivotM1(m1,k,M1_Left,M1_Right,0,false), pl=PivotM1(m1,k,M1_Left,M1_Right,1,false);
   if(state==WAITING_CHOCH && t>reactionTime && direction==1 && h.valid && ph.valid && h.value<ph.value && m1[k-1].close<=h.value && m1[k].close>h.value) {
      state=CHOCH_FOUND; chochLevel=h.value; chochTime=t; DrawMarker("VHB",t,chochLevel,clrAqua,true); DrawLevel("CHOCH",chochLevel,clrAqua);
   } else if(state==WAITING_CHOCH && t>reactionTime && direction==-1 && l.valid && pl.valid && l.value>pl.value && m1[k-1].close>=l.value && m1[k].close<l.value) {
      state=CHOCH_FOUND; chochLevel=l.value; chochTime=t; DrawMarker("VLB",t,chochLevel,clrRed,false); DrawLevel("CHOCH",chochLevel,clrAqua);
   }
   bool contiguous=t-m1[k-1].time==60;
   bool bullEngulf=contiguous && m1[k-1].close<m1[k-1].open && m1[k].close>m1[k].open && m1[k].open<=m1[k-1].close && m1[k].close>m1[k-1].open && m1[k].close-m1[k].open>(m1[k-1].open-m1[k-1].close)*Engulf_Multiplier;
   bool bearEngulf=contiguous && m1[k-1].close>m1[k-1].open && m1[k].close<m1[k].open && m1[k].open>=m1[k-1].close && m1[k].close<m1[k-1].open && m1[k].open-m1[k].close>(m1[k-1].close-m1[k-1].open)*Engulf_Multiplier;
   bool pathReady=setupType=="FTB" || (setupType=="BT" && fib>0 && MathAbs(m1[k].close-fib)<=Fib_Tolerance_Ticks*tick);
   if(state==CHOCH_FOUND && t>=chochTime+120 && pathReady && ((direction==1 && bullEngulf)||(direction==-1 && bearEngulf))) {
      double stop=RoundTick(direction==1?m1[k].low-Stop_Buffer_Ticks*tick:m1[k].high+Stop_Buffer_Ticks*tick,tick);
      double risk=direction==1?m1[k].close-stop:stop-m1[k].close;
      if(stop>0 && risk>0) {
         DrawMarker(direction==1?"BUY":"SELL",t,m1[k].close,direction==1?clrLime:clrRed,direction==1);
         TesterOrder(direction==1,m1[k].close,stop,tick);
         state=ENTRY_SIGNAL;
      }
   }
}
int OnInit() {
   if(!ValidInputs()) { Print("TB v15: invalid inputs"); return INIT_PARAMETERS_INCORRECT; }
   trade.SetExpertMagicNumber(Magic_Number);
   lastM1Open=iTime(_Symbol,PERIOD_M1,0);
   Print("TB v15 draft: orders are possible ONLY in Strategy Tester after explicit opt-in.");
   return INIT_SUCCEEDED;
}
void OnTick() {
   datetime current=iTime(_Symbol,PERIOD_M1,0);
   if(current<=0 || current==lastM1Open) return;
   lastM1Open=current; ProcessClosedM1();
}
void OnDeinit(const int reason) {
   if(TB_TESTER_VISUALS) ObjectsDeleteAll(0,"TBV15_");
}
