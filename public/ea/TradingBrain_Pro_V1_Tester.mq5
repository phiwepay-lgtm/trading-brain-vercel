// TradingBrain Pro V1 tester-only research draft; NOT compiled or broker-verified.
// No live/demo orders: CTrade is hard-restricted to the Strategy Tester and
// requires explicit opt-in. The website and legacy MT5 scanner remain HOLD.
// Pivot/HA initialization, session clock, execution timing and fills can differ
// from Pine. Do not use this source as a verified translation or performance.
#property strict
#property version "1.00"
#property description "Pro V1 BT/FTB tester-only research; uncompiled."
#include <Trade/Trade.mqh>
#define TB_TESTER_VISUALS true

input bool Enable_Simulation = false;
input bool Sessions_Confirmed = false;
input bool Bypass_Session = true; // All available hours in Strategy Tester; research only.
input bool Broker_UTC_Offset_Confirmed = false;
input int Broker_UTC_Offset_Minutes = 0; // Broker bar-time minus UTC; user must confirm for ALL tested dates.
input bool Enable_StrategyTester_Orders = false; // Disabled by default, cannot place live/demo orders.
enum EdgeMode { EDGE_BOTH=0, EDGE_FTB_ONLY=1, EDGE_BT_ONLY=2 };
input EdgeMode Test_Mode = EDGE_BOTH;
input bool Use_FTB = true;
input bool Require_HA_Color_Shift = true;
input int FTB_Touch_Bound_Ticks = 30; // Exact HA touch plus maximum penetration; no near misses.
input double RR_Ratio = 2.5;
input double Engulf_Multiplier = 1.2;
input int Stop_Buffer_Ticks = 10;
input double Order_Quantity = 0.01; // MT5 lots, NOT Pine contracts/units.
input int M5_Lookback = 200;
input int HA_History_Bars = 5000; // HA seed window only; not the Strategy Tester date range.
input int M5_Left = 2;
input int M5_Right = 2;
input int M1_Left = 2;
input int M1_Right = 2;
input long Magic_Number = 153153;

CTrade trade;
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
// Reporting is scoped to transactions observed in this tester run. Reconcile
// these provisional position counts against the native Strategy Tester report.
long filledPositions=0, closedPositions=0;
bool reportReliable=true, reportFinished=false;
struct ReportedPosition { ulong id; bool filled; bool closed; };
ReportedPosition reportedPositions[];


bool ValidInputs() {
   return M5_Lookback>=2 && M5_Left>=1 && M5_Right>=1 && M1_Left>=1 && M1_Right>=1 &&
      M5_Left<=50 && M5_Right<=50 && M1_Left<=50 && M1_Right<=50 && M5_Lookback<=1000 &&
      FTB_Touch_Bound_Ticks>=0 && Stop_Buffer_Ticks>=0 &&
      HA_History_Bars>=M5_Lookback+M5_Left+M5_Right+4 && HA_History_Bars<=100000 &&
      (Test_Mode==EDGE_BOTH || Test_Mode==EDGE_FTB_ONLY || Test_Mode==EDGE_BT_ONLY) &&
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
   if(!TB_TESTER_VISUALS || !MQLInfoInteger(MQL_TESTER) || !MQLInfoInteger(MQL_VISUAL_MODE)) return;
   string name="TBPROV1_"+label+"_"+IntegerToString((long)when);
   if(ObjectCreate(0,name,up?OBJ_ARROW_BUY:OBJ_ARROW_SELL,0,when,price)) {
      ObjectSetInteger(0,name,OBJPROP_COLOR,c); ObjectSetString(0,name,OBJPROP_TOOLTIP,label+" candidate (unverified)");
   }
}
void DrawLevel(string label,double price,color c) {
   if(!TB_TESTER_VISUALS || !MQLInfoInteger(MQL_TESTER) || !MQLInfoInteger(MQL_VISUAL_MODE) || price<=0) return;
   string name="TBPROV1_"+label;
   if(ObjectFind(0,name)<0) ObjectCreate(0,name,OBJ_HLINE,0,0,price);
   ObjectSetDouble(0,name,OBJPROP_PRICE,price); ObjectSetInteger(0,name,OBJPROP_COLOR,c);
}
void ClearLevel(string label) {
   if(TB_TESTER_VISUALS && MQLInfoInteger(MQL_TESTER) && MQLInfoInteger(MQL_VISUAL_MODE))
      ObjectDelete(0,"TBPROV1_"+label);
}
// Draw executed tester deals separately from confirmation-candle markers.
void DrawDealMarker(ulong ticket,datetime when,double price,bool isExit) {
   if(!TB_TESTER_VISUALS || !MQLInfoInteger(MQL_TESTER) || !MQLInfoInteger(MQL_VISUAL_MODE)) return;
   string name="TBPROV1_DEAL_"+IntegerToString((long)ticket);
   if(ObjectCreate(0,name,OBJ_ARROW,0,when,price)) {
      ObjectSetInteger(0,name,OBJPROP_ARROWCODE,isExit?251:159);
      ObjectSetInteger(0,name,OBJPROP_COLOR,isExit?clrYellow:clrWhite);
      ObjectSetString(0,name,OBJPROP_TOOLTIP,isExit?"Simulated exit deal (may be partial)":"Simulated entry deal (may be partial)");
   }
}
void UpdateReportPanel() {
   if(!TB_TESTER_VISUALS || !MQLInfoInteger(MQL_TESTER) || !MQLInfoInteger(MQL_VISUAL_MODE)) return;
   string totals=reportReliable ?
      "Filled positions: "+IntegerToString(filledPositions)+"  Closed: "+IntegerToString(closedPositions)+"  Open: "+IntegerToString(filledPositions-closedPositions) :
      "Position counts unavailable: check tester report / Journal";
   Comment(reportFinished?"TB Pro V1 TESTER ONLY - run ended\n":"TB Pro V1 TESTER ONLY - current run\n",
           "Entry signals: ",IntegerToString(entryCandidates),"  Accepted requests: ",IntegerToString(acceptedOrders),"\n",
           totals,"\nWhite = entry deal, yellow X = exit deal; arrows = confirmations.\n",
           "Provisional counts: verify in Strategy Tester Results / Report.");
}
// Count one filled/closed position per position ID, not one per partial deal.
// HistorySelectByPosition provides the whole position even if trade-transaction
// callbacks arrive out of order. Reversals/close-by are outside this EA's
// one-position bracket model and are explicitly reported as unsupported.
void RecordTesterDeal(ulong ticket) {
   if(!HistoryDealSelect(ticket)) { reportReliable=false; return; }
   if(HistoryDealGetString(ticket,DEAL_SYMBOL)!=_Symbol) return;
   ulong positionId=(ulong)HistoryDealGetInteger(ticket,DEAL_POSITION_ID);
   ENUM_DEAL_ENTRY kind=(ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket,DEAL_ENTRY);
   datetime when=(datetime)HistoryDealGetInteger(ticket,DEAL_TIME);
   double price=HistoryDealGetDouble(ticket,DEAL_PRICE);
   if(positionId==0 || !HistorySelectByPosition(positionId)) { reportReliable=false; return; }
   double opened=0,exited=0;
   bool ours=false,otherEntry=false,unsupported=false;
   for(int i=0;i<HistoryDealsTotal();i++) {
      ulong deal=HistoryDealGetTicket(i);
      if(deal==0) { reportReliable=false; continue; }
      ENUM_DEAL_ENTRY entry=(ENUM_DEAL_ENTRY)HistoryDealGetInteger(deal,DEAL_ENTRY);
      double volume=HistoryDealGetDouble(deal,DEAL_VOLUME);
      if(entry==DEAL_ENTRY_IN) {
         if(HistoryDealGetInteger(deal,DEAL_MAGIC)==Magic_Number) { ours=true; opened+=volume; }
         else otherEntry=true;
      } else if(entry==DEAL_ENTRY_OUT) exited+=volume;
      else if(entry==DEAL_ENTRY_INOUT || entry==DEAL_ENTRY_OUT_BY) unsupported=true;
   }
   if(!ours) return;
   if(otherEntry || unsupported || exited>opened+1e-8) { reportReliable=false; }
   int index=-1;
   for(int i=0;i<ArraySize(reportedPositions);i++) if(reportedPositions[i].id==positionId) { index=i; break; }
   if(index<0) {
      index=ArraySize(reportedPositions);
      if(ArrayResize(reportedPositions,index+1)<0) { reportReliable=false; return; }
      reportedPositions[index].id=positionId; reportedPositions[index].filled=false; reportedPositions[index].closed=false;
   }
   if(opened>0 && !reportedPositions[index].filled) { reportedPositions[index].filled=true; filledPositions++; }
   if(!otherEntry && !unsupported && opened>0 && exited>=opened-1e-8 && !reportedPositions[index].closed) {
      reportedPositions[index].closed=true; closedPositions++;
   }
   if(kind==DEAL_ENTRY_IN || kind==DEAL_ENTRY_OUT) DrawDealMarker(ticket,when,price,kind==DEAL_ENTRY_OUT);
}
// Order placement is hard-gated to Strategy Tester, separately from detection.
// Market order is submitted on the first tick after the M1 signal bar closes;
// broker emulation, spread, gaps, stop distances and fills differ from Pine.
bool TesterOrder(bool buy,double signalClose,double stop,double tick) {
   if(!MQLInfoInteger(MQL_TESTER) || !Enable_Simulation || !Enable_StrategyTester_Orders) return false;
   double risk=buy?signalClose-stop:stop-signalClose;
   double target=RoundTick(buy?signalClose+risk*RR_Ratio:signalClose-risk*RR_Ratio,tick);
   double minLot=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN), maxLot=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX);
   double step=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   if(risk<=0 || stop<=0 || target<=0 || step<=0 || Order_Quantity<minLot || Order_Quantity>maxLot) {
      Print("TB Pro V1 tester: invalid risk, price or lot bounds. Check symbol specification."); return false;
   }
   double steps=Order_Quantity/step;
   if(MathAbs(steps-MathRound(steps))>1e-8) { Print("TB Pro V1 tester: lot size does not match broker volume step."); return false; }
   bool sent=buy?trade.Buy(Order_Quantity,_Symbol,0,stop,target,"TBProV1 research"):trade.Sell(Order_Quantity,_Symbol,0,stop,target,"TBProV1 research");
   if(!sent || (trade.ResultRetcode()!=TRADE_RETCODE_DONE && trade.ResultRetcode()!=TRADE_RETCODE_PLACED)) {
      Print("TB Pro V1 tester order rejected, retcode=",trade.ResultRetcode()); return false;
   }
   return true;
}

// All detection runs only in the tester, on confirmed standard M1 bars.
// M5 state is updated before session/position guards, as in the Pine draft.
void ProcessClosedM1() {
   if(!MQLInfoInteger(MQL_TESTER) || !Enable_Simulation || _Period!=PERIOD_M1) { state=NO_SESSION; ResetSetup(); return; }
   MqlRates m1[]; ArraySetAsSeries(m1,false);
   int n1=CopyRates(_Symbol,PERIOD_M1,1,2000,m1);
   if(n1<MathMax(4,M1_Left+M1_Right+4)) { missingM1++; return; }
   int k=n1-1; datetime t=m1[k].time; double tick=TickSize();
   if(tick<=0) return;
   processedM1++; if(firstProcessed==0) firstProcessed=t; lastProcessed=t;

   // Wait for the first CLOSED M1 candle of the next M5 interval. Checking
   // t>=currentM5 avoids processing one M1 too early at an M5 boundary.
   datetime currentM5=iTime(_Symbol,PERIOD_M5,0);
   datetime completedM5=iTime(_Symbol,PERIOD_M5,1);
   bool newM5=(currentM5>0 && completedM5>0 && t>=currentM5 && completedM5!=lastM5Handled);
   bool bullBos=false,bearBos=false,failedHigh=false,failedLow=false;
   double bLow=0,bHigh=0,signalFailureHigh=0,signalFailureLow=0;
   datetime signalHighPivot=0,signalLowPivot=0;
   if(newM5) {
      MqlRates m5[]; ArraySetAsSeries(m5,false);
      int n5=CopyRates(_Symbol,PERIOD_M5,1,HA_History_Bars,m5);
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
      if(previousM5Handled>0 && iBarShift(_Symbol,PERIOD_M5,previousM5Handled,true)!=2) {
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
         if(TesterOrder(direction==1,m1[k].close,stop,tick)) acceptedOrders++;
         // Reset detection after every signal, independently of open trades or
         // request rejection. Each later setup can produce another signal.
         state=EXPECTING_BOS; ResetSetup();
      }
   }
}
int OnInit() {
   if(!MQLInfoInteger(MQL_TESTER)) { Print("TB Pro V1: Strategy Tester only; no live or demo operation."); return INIT_FAILED; }
   // Independent concurrent long/short positions are impossible in MT5's
   // netting account mode. Fail closed instead of silently netting/reversing.
   if(AccountInfoInteger(ACCOUNT_MARGIN_MODE)!=ACCOUNT_MARGIN_MODE_RETAIL_HEDGING) {
      Print("TB Pro V1: tester requires a hedging account mode for independent overlapping trades.");
      return INIT_FAILED;
   }
   if(!ValidInputs()) { Print("TB Pro V1: invalid inputs"); return INIT_PARAMETERS_INCORRECT; }
   // Clear markers from an earlier visual run if this tester chart is reused.
   if(TB_TESTER_VISUALS && MQLInfoInteger(MQL_TESTER)) ObjectsDeleteAll(0,"TBPROV1_");
   trade.SetExpertMagicNumber(Magic_Number);
   trade.SetTypeFillingBySymbol(_Symbol);
   lastM1Open=iTime(_Symbol,PERIOD_M1,0);
   Print("TB Pro V1 research: tester orders require Enable_Simulation AND Enable_StrategyTester_Orders; bypass=",Bypass_Session);
   if(!Bypass_Session && (!Sessions_Confirmed || !Broker_UTC_Offset_Confirmed))
      Print("TB Pro V1: session mode requires confirmation of both sessions and historical broker UTC offset.");
   UpdateReportPanel();
   return INIT_SUCCEEDED;
}
void OnTradeTransaction(const MqlTradeTransaction &trans,const MqlTradeRequest &request,const MqlTradeResult &result) {
   if(!MQLInfoInteger(MQL_TESTER) || trans.type!=TRADE_TRANSACTION_DEAL_ADD || trans.deal==0) return;
   RecordTesterDeal(trans.deal);
   UpdateReportPanel();
}
void OnTick() {
   datetime current=iTime(_Symbol,PERIOD_M1,0);
   if(current<=0 || current==lastM1Open) return;
   lastM1Open=current; ProcessClosedM1(); UpdateReportPanel();
}
void OnDeinit(const int reason) {
   if(MQLInfoInteger(MQL_TESTER)) {
      string firstTime=processedM1>0?TimeToString(firstProcessed,TIME_DATE|TIME_MINUTES):"n/a";
      string lastTime=processedM1>0?TimeToString(lastProcessed,TIME_DATE|TIME_MINUTES):"n/a";
      Print("TB Pro V1 diagnostics: M1 processed=",processedM1," M5 updates=",observedM5,
            " first M1=",firstTime," last M1=",lastTime,
            " insufficient M1=",missingM1," insufficient M5=",missingM5," skipped M5 update events=",skippedM5Events," copied M5 window min/max=",minM5Copied,"/",maxM5Copied,
            " BT candidates=",btCandidates," FTB candidates=",ftbCandidates," CHoCH=",chochCandidates,
            " entry candidates=",entryCandidates," accepted orders=",acceptedOrders,
            ". Counts are diagnostics, NOT closed trades or verified performance.");
      Print("TB Pro V1 reporting: entry signals=",entryCandidates," accepted requests=",acceptedOrders,
            " filled positions=",filledPositions," closed positions=",closedPositions,
            " open positions=",filledPositions-closedPositions," reliable=",reportReliable,
            ". Provisional tester-run counts; reconcile against the native Results/Report.");
   }
   // Keep this run's visual markers while the tester chart remains open. They
   // are cleared at the start of the next run and are not persistent storage.
   reportFinished=true; UpdateReportPanel();
}
