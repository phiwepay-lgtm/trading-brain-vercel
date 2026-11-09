// TradingBrain Pro V1 visual indicator research draft. UNCOMPILED.
// Replays loaded M1 bars against previously completed M5 candles. No broker
// orders, network, persistence, or guaranteed platform parity. Long histories
// can be slow because historical M1/M5 windows are copied for each event.
#property strict
#property version "1.00"
#property indicator_chart_window
#property indicator_plots 0
#property indicator_buffers 0
input bool Enable_Simulation = true; // Visual research only; no orders are placed.
input bool Sessions_Confirmed = false;
input bool Bypass_Session = true; // All available hours in Strategy Tester; research only.
input bool Broker_UTC_Offset_Confirmed = false;
input int Broker_UTC_Offset_Minutes = 0; // Broker bar-time minus UTC; user must confirm for ALL tested dates.
enum EdgeMode { EDGE_BOTH=0, EDGE_FTB_ONLY=1, EDGE_BT_ONLY=2 };
input EdgeMode Test_Mode = EDGE_BOTH;
input bool Use_FTB = true;
input bool Require_HA_Color_Shift = true;
input int FTB_Touch_Bound_Ticks = 30; // Exact HA touch plus maximum penetration; no near misses.
input double RR_Ratio = 2.5;
input double Engulf_Multiplier = 1.2;
input int Stop_Buffer_Ticks = 10;
input int M5_Lookback = 200;
input int HA_History_Bars = 5000; // HA seed window only; not the Strategy Tester date range.
input int M5_Left = 2;
input int M5_Right = 2;
input int M1_Left = 2;
input int M1_Right = 2;

enum State { NO_SESSION, EXPECTING_BOS, BT_FOUND, FTB_FOUND, WAITING_ANCHORS, WAITING_0382, WAITING_CHOCH, CHOCH_FOUND, ENTRY_SIGNAL, AMBIGUOUS };
State state = NO_SESSION;
struct HA { datetime time; double open, high, low, close; };
struct Pivot { bool valid; int idx; datetime time; double value; };
datetime lastM1Open=0, lastM5Handled=0, usedHigh=0, usedLow=0;
datetime seenHighPivot=0, seenLowPivot=0, firstProcessed=0, lastProcessed=0;
long observedM5=0, activeHighAt=0, activeLowAt=0;
long processedM1=0, missingM1=0, missingM5=0, skippedM5Events=0, ftbCandidates=0, btCandidates=0, chochCandidates=0, entryCandidates=0, acceptedOrders=0;
int minM5Copied=0, maxM5Copied=0;
bool haveActiveHigh=false, haveActiveLow=false;
double activeHigh=0, activeLow=0;
datetime bosTime=0, reactionTime=0, chochTime=0;
int direction=0;
string setupType="NONE";
double fib=0, chochLevel=0, failedLevel=0;
// Brackets are independent visual simulations, not platform orders or fills.
struct VirtualPosition { int direction; datetime time; double stop, target; long id; };
VirtualPosition virtualPositions[];
long virtualClosed=0, virtualCensored=0, virtualAmbiguous=0, nextVirtualId=0;
datetime lastObserved=0;


bool ValidInputs() {
   return M5_Lookback>=2 && M5_Left>=1 && M5_Right>=1 && M1_Left>=1 && M1_Right>=1 &&
      M5_Left<=50 && M5_Right<=50 && M1_Left<=50 && M1_Right<=50 && M5_Lookback<=1000 &&
      FTB_Touch_Bound_Ticks>=0 && Stop_Buffer_Ticks>=0 &&
      HA_History_Bars>=M5_Lookback+M5_Left+M5_Right+4 && HA_History_Bars<=100000 &&
      (Test_Mode==EDGE_BOTH || Test_Mode==EDGE_FTB_ONLY || Test_Mode==EDGE_BT_ONLY) &&
      RR_Ratio>0 && Engulf_Multiplier>=1 &&
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
   if(Bypass_Session) return true;
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
bool FreshLatest(const Pivot &p,int end) { return p.valid && end-p.idx<=M5_Lookback*2; }
void ResetSetup() { direction=0; setupType="NONE"; fib=0; chochLevel=0; failedLevel=0; bosTime=0; reactionTime=0; chochTime=0; }
void DrawMarker(string label,datetime when,double price,color c,bool up) {
   string name="TBPROI_"+label+"_"+IntegerToString((long)when);
   if(ObjectCreate(0,name,up?OBJ_ARROW_BUY:OBJ_ARROW_SELL,0,when,price)) {
      ObjectSetInteger(0,name,OBJPROP_COLOR,c);
      ObjectSetString(0,name,OBJPROP_TOOLTIP,label+" (virtual research; not a fill)");
   }
}
void DrawLevel(string label,double price,color c) {
   if(price<=0) return;
   string name="TBPROI_"+label;
   if(ObjectFind(0,name)<0) ObjectCreate(0,name,OBJ_HLINE,0,0,price);
   ObjectSetDouble(0,name,OBJPROP_PRICE,price); ObjectSetInteger(0,name,OBJPROP_COLOR,c);
}
void ClearLevel(string label) { ObjectDelete(0,"TBPROI_"+label); }
// The next closed M1 bar is evaluated before any new signal. The first open
// past a bracket determines the gap side; double-touch order remains unknown.
void ProcessVirtual(const MqlRates &bar) {
   if(lastObserved>0 && bar.time-lastObserved!=60) {
      virtualCensored+=ArraySize(virtualPositions); ArrayResize(virtualPositions,0);
   } else {
      for(int i=ArraySize(virtualPositions)-1;i>=0;i--) {
         VirtualPosition v=virtualPositions[i];
         if(bar.time<=v.time) continue;
         bool openStop=v.direction==1?bar.open<=v.stop:bar.open>=v.stop;
         bool openTarget=v.direction==1?bar.open>=v.target:bar.open<=v.target;
         bool hitStop=v.direction==1?bar.low<=v.stop:bar.high>=v.stop;
         bool hitTarget=v.direction==1?bar.high>=v.target:bar.low<=v.target;
         bool ambiguous=!openStop && !openTarget && hitStop && hitTarget;
         if(openStop || openTarget || hitStop || hitTarget) {
            if(ambiguous) {
               virtualCensored++; virtualAmbiguous++;
               DrawMarker("AMBIGUOUS "+IntegerToString(v.id),bar.time,bar.close,clrOrange,true);
            } else {
               bool stopped=openStop || (!openTarget && hitStop);
               double level=openStop || openTarget ? bar.open : (stopped?v.stop:v.target);
               virtualClosed++;
               DrawMarker((stopped?"VIRTUAL SL ":"VIRTUAL TP ")+IntegerToString(v.id),bar.time,level,stopped?clrRed:clrLime,true);
            }
            int count=ArraySize(virtualPositions);
            for(int j=i;j<count-1;j++) virtualPositions[j]=virtualPositions[j+1];
            ArrayResize(virtualPositions,count-1);
         }
      }
   }
   lastObserved=bar.time;
}
bool OpenVirtual(int dir,datetime t,double stop,double target,double price) {
   if(price<=0 || stop<=0 || target<=0 || (dir==1 && !(stop<price && target>price)) || (dir==-1 && !(target<price && stop>price))) return false;
   int n=ArraySize(virtualPositions);
   if(ArrayResize(virtualPositions,n+1)<0) { Print("TB Pro V1 indicator: cannot allocate position"); return false; }
   virtualPositions[n].direction=dir; virtualPositions[n].time=t;
   virtualPositions[n].stop=stop; virtualPositions[n].target=target; virtualPositions[n].id=++nextVirtualId;
   return true;
}
// Historical replay uses only confirmed standard M1 bars.
// M5 state is updated before session/position guards, as in the Pine draft.
void ProcessClosedM1(int shift) {
   if(!Enable_Simulation || _Period!=PERIOD_M1) { state=NO_SESSION; ResetSetup(); return; }
   MqlRates m1[]; ArraySetAsSeries(m1,false);
   int n1=CopyRates(_Symbol,PERIOD_M1,shift,2000,m1);
   if(n1<MathMax(4,M1_Left+M1_Right+4)) { missingM1++; return; }
   int k=n1-1; datetime t=m1[k].time; double tick=TickSize();
   if(tick<=0) return;
   bool missingInterval=lastObserved>0 && t-lastObserved!=60;
   ProcessVirtual(m1[k]);
   if(missingInterval) { state=NO_SESSION; ResetSetup(); haveActiveHigh=false; haveActiveLow=false; }
   processedM1++; if(firstProcessed==0) firstProcessed=t; lastProcessed=t;

   // Wait for the first CLOSED M1 candle of the next M5 interval. Checking
   // t>=currentM5 avoids processing one M1 too early at an M5 boundary.
   int m5shift=iBarShift(_Symbol,PERIOD_M5,t,false);
   if(m5shift<0) { missingM5++; return; }
   datetime currentM5=iTime(_Symbol,PERIOD_M5,m5shift);
   datetime completedM5=iTime(_Symbol,PERIOD_M5,m5shift+1);
   if(currentM5<=0 || t>=currentM5+300) { missingM5++; return; }
   bool newM5=(currentM5>0 && completedM5>0 && t>=currentM5 && completedM5!=lastM5Handled);
   bool bullBos=false,bearBos=false,failedHigh=false,failedLow=false;
   double bLow=0,bHigh=0,signalFailureHigh=0,signalFailureLow=0;
   datetime signalHighPivot=0,signalLowPivot=0;
   if(newM5) {
      MqlRates m5[]; ArraySetAsSeries(m5,false);
      int n5=CopyRates(_Symbol,PERIOD_M5,m5shift+1,HA_History_Bars,m5);
      HA a[];
      if(n5<M5_Lookback+M5_Left+M5_Right+4 || !BuildHA(m5,n5,a)) { missingM5++; return; }
      if(minM5Copied==0 || n5<minM5Copied) minM5Copied=n5;
      if(n5>maxM5Copied) maxM5Copied=n5;
      datetime previousM5Handled=lastM5Handled;
      lastM5Handled=completedM5; observedM5++;
      int e=n5-1;
      Pivot hi=PivotHA(a,e,M5_Left,M5_Right,0,true), lo=PivotHA(a,e,M5_Left,M5_Right,0,false);
      // e-1 expectations were confirmed before the signal M5 candle began.
      Pivot eh=PivotHA(a,e-1,M5_Left,M5_Right,0,true), el=PivotHA(a,e-1,M5_Left,M5_Right,0,false);
      // If one or more completed M5 bars were skipped, do not keep stale
      // expectations or re-arm a pivot whose intervening breaks are unknown.
      if(previousM5Handled>0 && iBarShift(_Symbol,PERIOD_M5,previousM5Handled,true)!=m5shift+2) {
         skippedM5Events++; haveActiveHigh=false; haveActiveLow=false;
         seenHighPivot=eh.valid?eh.time:0; seenLowPivot=el.valid?el.time:0;
      }
      if(eh.valid && eh.time!=seenHighPivot) { seenHighPivot=eh.time; activeHigh=eh.value; activeHighAt=observedM5; haveActiveHigh=true; }
      if(el.valid && el.time!=seenLowPivot) { seenLowPivot=el.time; activeLow=el.value; activeLowAt=observedM5; haveActiveLow=true; }
      if(haveActiveHigh && (observedM5-activeHighAt>M5_Lookback || a[e].close>activeHigh)) haveActiveHigh=false;
      if(haveActiveLow && (observedM5-activeLowAt>M5_Lookback || a[e].close<activeLow)) haveActiveLow=false;
      // Mirror BT: M5 HA close breaks the latest confirmed high or low.
      bullBos=FreshLatest(hi,e) && a[e].close>hi.value && usedHigh!=hi.time;
      bearBos=FreshLatest(lo,e) && a[e].close<lo.value && usedLow!=lo.time;
      double tolerance=FTB_Touch_Bound_Ticks*tick;
      // The ± bound alone allows near misses; the additional exact HA touch is intentional.
      failedHigh=Use_FTB && haveActiveHigh && a[e].high>=activeHigh && a[e].high<=activeHigh+tolerance && a[e].close<activeHigh && a[e].close<a[e].open && (!Require_HA_Color_Shift || a[e-1].close>a[e-1].open);
      failedLow=Use_FTB && haveActiveLow && a[e].low<=activeLow && a[e].low>=activeLow-tolerance && a[e].close>activeLow && a[e].close>a[e].open && (!Require_HA_Color_Shift || a[e-1].close<a[e-1].open);
      signalFailureHigh=activeHigh; signalFailureLow=activeLow;
      // Mirrored provisional anchors: prior opposite pivot and BOS HA extreme.
      if(bullBos) { signalHighPivot=hi.time; bLow=FreshLatest(lo,e)?lo.value:0; bHigh=a[e].high; }
      if(bearBos) { signalLowPivot=lo.time; bLow=a[e].low; bHigh=FreshLatest(hi,e)?hi.value:0; }
   }

   if(!GoldenSession(t)) { state=NO_SESSION; ResetSetup(); return; }
   if(bullBos) btCandidates++; if(bearBos) btCandidates++;
   if(failedHigh) ftbCandidates++; if(failedLow) ftbCandidates++;
   if(state==NO_SESSION || state==ENTRY_SIGNAL) state=EXPECTING_BOS;

   int count=(bullBos?1:0)+(bearBos?1:0)+(failedHigh?1:0)+(failedLow?1:0);
   if(count>0) {
      if(bullBos) usedHigh=signalHighPivot;
      if(bearBos) usedLow=signalLowPivot;
      ResetSetup(); bosTime=t;
      if(count!=1) { state=AMBIGUOUS; return; }
      direction=(bullBos || failedLow)?1:-1;
      setupType=(bullBos || bearBos)?"BT":"FTB";
      if(setupType=="FTB") {
         failedLevel=failedHigh?signalFailureHigh:signalFailureLow; reactionTime=t; state=FTB_FOUND;
         ClearLevel("Fib"); DrawMarker("FTB",t,failedLevel,clrMagenta,direction==1); DrawLevel("FTB",failedLevel,clrMagenta);
      } else {
         ClearLevel("FTB");
         if(bLow<=0 || bHigh<=bLow) { state=WAITING_ANCHORS; return; }
         fib=direction==1?bHigh-(bHigh-bLow)*0.382:bLow+(bHigh-bLow)*0.382;
         state=BT_FOUND; DrawLevel("Fib",fib,clrOrange);
      }
      return;
   }
   if(state==FTB_FOUND && t>bosTime) state=WAITING_CHOCH;
   if(state==BT_FOUND && t>bosTime) state=WAITING_0382;
   if(state==WAITING_0382 && t>bosTime && m1[k].low<=fib && m1[k].high>=fib) { state=WAITING_CHOCH; reactionTime=t; }
   Pivot h=PivotM1(m1,k,M1_Left,M1_Right,0,true), ph=PivotM1(m1,k,M1_Left,M1_Right,1,true);
   Pivot l=PivotM1(m1,k,M1_Left,M1_Right,0,false), pl=PivotM1(m1,k,M1_Left,M1_Right,1,false);
   if(state==WAITING_CHOCH && t>reactionTime && direction==1 && h.valid && ph.valid && h.value<ph.value && m1[k-1].close<=h.value && m1[k].close>h.value) {
      state=CHOCH_FOUND; chochLevel=h.value; chochTime=t; chochCandidates++; DrawMarker("VHB",t,chochLevel,clrAqua,true); DrawLevel("CHOCH",chochLevel,clrAqua);
   } else if(state==WAITING_CHOCH && t>reactionTime && direction==-1 && l.valid && pl.valid && l.value>pl.value && m1[k-1].close>=l.value && m1[k].close<l.value) {
      state=CHOCH_FOUND; chochLevel=l.value; chochTime=t; chochCandidates++; DrawMarker("VLB",t,chochLevel,clrRed,false); DrawLevel("CHOCH",chochLevel,clrAqua);
   }
   bool contiguous=t-m1[k-1].time==60;
   bool bullEngulf=contiguous && m1[k-1].close<m1[k-1].open && m1[k].close>m1[k].open && m1[k].open<=m1[k-1].close && m1[k].close>m1[k-1].open && m1[k].close-m1[k].open>(m1[k-1].open-m1[k-1].close)*Engulf_Multiplier;
   bool bearEngulf=contiguous && m1[k-1].close>m1[k-1].open && m1[k].close<m1[k].open && m1[k].open>=m1[k-1].close && m1[k].close<m1[k-1].open && m1[k].open-m1[k].close>(m1[k-1].close-m1[k-1].open)*Engulf_Multiplier;
   // BT already reacted to 0.382 before CHoCH. No entry-close proximity
   // filter: the user confirmed the entry can occur farther from the level.
   bool pathReady=setupType=="FTB" || (setupType=="BT" && fib>0);
   bool edgeAllowed=(setupType=="BT" && (Test_Mode==EDGE_BOTH || Test_Mode==EDGE_BT_ONLY)) || (setupType=="FTB" && (Test_Mode==EDGE_BOTH || Test_Mode==EDGE_FTB_ONLY));
   if(state==CHOCH_FOUND && t>=chochTime+120 && pathReady && edgeAllowed && ((direction==1 && bullEngulf)||(direction==-1 && bearEngulf))) {
      double stop=RoundTick(direction==1?m1[k].low-Stop_Buffer_Ticks*tick:m1[k].high+Stop_Buffer_Ticks*tick,tick);
      double risk=direction==1?m1[k].close-stop:stop-m1[k].close;
      if(stop>0 && risk>0) {
         entryCandidates++;
         DrawMarker(direction==1?"BUY SIGNAL":"SELL SIGNAL",t,m1[k].close,direction==1?clrLime:clrRed,direction==1);
         double target=RoundTick(direction==1?m1[k].close+risk*RR_Ratio:m1[k].close-risk*RR_Ratio,tick);
         if(OpenVirtual(direction,t,stop,target,m1[k].close)) acceptedOrders++;
         // Reset detection after every signal, independently of open trades or
         // request rejection. Each later setup can produce another signal.
         state=EXPECTING_BOS; ResetSetup();
      }
   }
}
// A fresh history calculation restarts all state; no account history or files.
void ResetReplay() {
   ObjectsDeleteAll(0,"TBPROI_");
   state=NO_SESSION; ResetSetup(); lastM1Open=0; lastM5Handled=0; usedHigh=0; usedLow=0;
   seenHighPivot=0; seenLowPivot=0; firstProcessed=0; lastProcessed=0; lastObserved=0;
   observedM5=0; activeHighAt=0; activeLowAt=0; processedM1=0; missingM1=0; missingM5=0;
   skippedM5Events=0; ftbCandidates=0; btCandidates=0; chochCandidates=0; entryCandidates=0; acceptedOrders=0;
   minM5Copied=0; maxM5Copied=0; haveActiveHigh=false; haveActiveLow=false; activeHigh=0; activeLow=0;
   virtualClosed=0; virtualCensored=0; virtualAmbiguous=0; nextVirtualId=0; ArrayResize(virtualPositions,0);
}
int OnInit() {
   if(!ValidInputs()) { Print("TB Pro V1 indicator: invalid inputs"); return INIT_PARAMETERS_INCORRECT; }
   IndicatorSetString(INDICATOR_SHORTNAME,"TradingBrain Pro V1 Research");
   ResetReplay();
   return INIT_SUCCEEDED;
}
int OnCalculate(const int rates_total,const int prev_calculated,const datetime &time[],const double &open[],
                const double &high[],const double &low[],const double &close[],const long &tick_volume[],
                const long &volume[],const int &spread[]) {
   if(_Period!=PERIOD_M1) { Comment("TB Pro V1: use a standard M1 chart."); return rates_total; }
   if(!Enable_Simulation) { Comment("TB Pro V1: structural simulation OFF."); return rates_total; }
   if(rates_total<3) return 0;
   if(!SeriesInfoInteger(_Symbol,PERIOD_M5,SERIES_SYNCHRONIZED)) {
      MqlRates warmup[]; CopyRates(_Symbol,PERIOD_M5,0,1,warmup);
      Comment("TB Pro V1: waiting for M5 history; no results yet."); return 0;
   }
   ArraySetAsSeries(time,true);
   if(prev_calculated==0) ResetReplay();
   if(lastM1Open==time[1]) return rates_total;
   int start=rates_total-2;
   if(lastM1Open>0) {
      int oldShift=iBarShift(_Symbol,PERIOD_M1,lastM1Open,true);
      if(oldShift<1) { ResetReplay(); }
      else start=oldShift-1;
   }
   for(int shift=start;shift>=1;shift--) {
      if(IsStopped()) return 0;
      ProcessClosedM1(shift);
      lastM1Open=time[shift];
   }
   Comment("TB Pro V1 visual research - loaded M1 history only\n",
           "Entry signals: ",IntegerToString(entryCandidates),"  Virtual positions: ",IntegerToString(acceptedOrders),"\n",
           "Open: ",IntegerToString(ArraySize(virtualPositions)),"  Closed: ",IntegerToString(virtualClosed),
           "  Censored: ",IntegerToString(virtualCensored),"  Double touch: ",IntegerToString(virtualAmbiguous),"\n",
           "M1 processed: ",IntegerToString(processedM1),"  Insufficient M5: ",IntegerToString(missingM5),"\n",
           "No broker orders. Draft logic, OHLC exits and session settings are unverified.");
   return rates_total;
}
void OnDeinit(const int reason) { ObjectsDeleteAll(0,"TBPROI_"); Comment(""); }
