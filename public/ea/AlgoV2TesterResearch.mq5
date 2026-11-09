// Unverified Strategy Tester-only EA draft. Live/demo orders are forbidden.
#property strict
#property version "1.00"
#property description "Algo V1 Strategy Tester research; disabled by default, not for live/demo."
#include <Trade/Trade.mqh>
#include <AlgoV1Core.mqh>
input bool EnableTesterOrders=false;
input bool SaveTesterDealsCSV=false;
input double Lots=0.01;
input int PivotLeft=2;
input int PivotRight=2;
input int M5Expiry=48;
input int M1Expiry=240;
input int StopBufferTicks=10;
input int HistoryM1=5000;
input long MagicNumber=83400457;
input bool ShowVisualStudy=true;
input int StudyWidth=60;
input int MaxStudySets=40;
enum AlgoMode { BOTH=0, CONTINUATION=1, FTB=2 };
input AlgoMode Mode=BOTH;
enum AlgoTP { TP_2=2, TP_3=3, TP_4=4, TP_5=5, TP_7=7 };
input AlgoTP TargetR=TP_3;
enum AlgoBE { BE_OFF=0, BE_2=2, BE_3=3 };
input AlgoBE BreakevenR=BE_OFF;
input bool UseStructureExit=true;
CTrade trade;
datetime lastM1=0;
double initialRisk=0;
ulong trackedTicket=0;
bool beMoved=false;
int dealFile=INVALID_HANDLE;
string dealFileName="";
ulong loggedDeals[];
// MQL5 CSV writes are tester-local and disabled unless explicitly enabled.
string SafeCell(string s) {
   StringReplace(s,",","_"); StringReplace(s,"\r","_"); StringReplace(s,"\n","_"); StringReplace(s,"\t","_");
   if(StringLen(s)>0) { ushort c=StringGetCharacter(s,0); if(c=='=' || c=='+' || c=='-' || c=='@') s="'"+s; }
   return s;
}
void OpenDealLog() {
   if(!SaveTesterDealsCSV || !MQLInfoInteger(MQL_TESTER)) return;
   dealFileName="AlgoV2_Tester_Deals_"+(string)GetTickCount64()+".csv";
   dealFile=FileOpen(dealFileName,FILE_READ|FILE_WRITE|FILE_CSV|FILE_ANSI,',',CP_UTF8);
   if(dealFile==INVALID_HANDLE) { Print("CSV log could not be opened; error ",GetLastError()); return; }
   if(FileSize(dealFile)==0) FileWrite(dealFile,"time_broker","symbol","deal_id","position_id","deal_type","entry_type","volume","price","profit","commission","swap","currency","reason");
   FileSeek(dealFile,0,SEEK_END); FileFlush(dealFile);
   Print("Tester deal CSV file: ",dealFileName," in the tester agent Files sandbox.");
}
void OnDeinit(const int reason) { if(dealFile!=INVALID_HANDLE) { FileFlush(dealFile); FileClose(dealFile); dealFile=INVALID_HANDLE; } }
// Match exits to an entry from this EA even if a broker assigns another exit magic.
bool BelongsToEA(ulong positionId) {
   if(positionId==0 || !HistorySelectByPosition(positionId)) return false;
   int n=HistoryDealsTotal();
   for(int i=0;i<n;i++) {
      ulong deal=HistoryDealGetTicket(i);
      if(deal>0 && HistoryDealGetInteger(deal,DEAL_MAGIC)==MagicNumber && HistoryDealGetInteger(deal,DEAL_ENTRY)==DEAL_ENTRY_IN && HistoryDealGetString(deal,DEAL_SYMBOL)==_Symbol) return true;
   }
   return false;
}
void OnTradeTransaction(const MqlTradeTransaction &trans,const MqlTradeRequest &request,const MqlTradeResult &result) {
   if(!MQLInfoInteger(MQL_TESTER) || !SaveTesterDealsCSV || dealFile==INVALID_HANDLE || trans.type!=TRADE_TRANSACTION_DEAL_ADD || trans.deal==0) return;
   for(int i=0;i<ArraySize(loggedDeals);i++) if(loggedDeals[i]==trans.deal) return;
   if(!HistoryDealSelect(trans.deal)) { Print("CSV deal unavailable: ",trans.deal); return; }
   string symbol=HistoryDealGetString(trans.deal,DEAL_SYMBOL);
   ulong positionId=(ulong)HistoryDealGetInteger(trans.deal,DEAL_POSITION_ID);
   long magic=HistoryDealGetInteger(trans.deal,DEAL_MAGIC);
   long kind=HistoryDealGetInteger(trans.deal,DEAL_ENTRY);
   datetime stamp=(datetime)HistoryDealGetInteger(trans.deal,DEAL_TIME);
   long dealType=HistoryDealGetInteger(trans.deal,DEAL_TYPE);
   long reason=HistoryDealGetInteger(trans.deal,DEAL_REASON);
   double volume=HistoryDealGetDouble(trans.deal,DEAL_VOLUME), price=HistoryDealGetDouble(trans.deal,DEAL_PRICE);
   double profit=HistoryDealGetDouble(trans.deal,DEAL_PROFIT), commission=HistoryDealGetDouble(trans.deal,DEAL_COMMISSION), swap=HistoryDealGetDouble(trans.deal,DEAL_SWAP);
   if(symbol!=_Symbol || positionId==0 || (kind!=DEAL_ENTRY_IN && kind!=DEAL_ENTRY_OUT && kind!=DEAL_ENTRY_OUT_BY)) return;
   if(!(kind==DEAL_ENTRY_IN && magic==MagicNumber) && !BelongsToEA(positionId)) { Print("CSV ignored unmatched deal ",trans.deal); return; }
   FileSeek(dealFile,0,SEEK_END);
   uint written=FileWrite(dealFile,TimeToString(stamp,TIME_DATE|TIME_SECONDS),SafeCell(symbol),(string)trans.deal,(string)positionId,EnumToString((ENUM_DEAL_TYPE)dealType),EnumToString((ENUM_DEAL_ENTRY)kind),DoubleToString(volume,8),DoubleToString(price,_Digits),DoubleToString(profit,8),DoubleToString(commission,8),DoubleToString(swap,8),SafeCell(AccountInfoString(ACCOUNT_CURRENCY)),EnumToString((ENUM_DEAL_REASON)reason));
   if(written==0) { Print("CSV write failed for deal ",trans.deal," error ",GetLastError()); return; }
   FileFlush(dealFile); int count=ArraySize(loggedDeals); ArrayResize(loggedDeals,count+1); loggedDeals[count]=trans.deal;
}
// Bounded visual-only drawings. These never submit orders.
string drawingPrefix="ALV2_";
string pivotNames[], levelGroups[], fibGroups[], breakNames[];
void Remember(string &items[],string value,int limit) {
   int n=ArraySize(items); ArrayResize(items,n+1); items[n]=value;
   if(n+1>limit) { ObjectDelete(0,items[0]); for(int i=1;i<n+1;i++) items[i-1]=items[i]; ArrayResize(items,n); }
}
void DrawDot(string kind,datetime t,double price,color col) {
   if(price==0 || t==0) return;
   string name=drawingPrefix+kind+"_"+(string)(long)t;
   if(ObjectCreate(0,name,OBJ_ARROW,0,t,price)) { ObjectSetInteger(0,name,OBJPROP_ARROWCODE,159); ObjectSetInteger(0,name,OBJPROP_COLOR,col); Remember(pivotNames,name,500); }
}
void DrawTrend(string name,datetime a,datetime b,double price,color col,ENUM_LINE_STYLE style) {
   if(ObjectCreate(0,name,OBJ_TREND,0,a,price,b,price)) { ObjectSetInteger(0,name,OBJPROP_COLOR,col); ObjectSetInteger(0,name,OBJPROP_STYLE,style); ObjectSetInteger(0,name,OBJPROP_RAY_RIGHT,false); }
}
void DrawFib(datetime t,AlgoResult &r) {
   if(r.fib==0 || r.anchorHigh==0 || r.anchorLow==0) return;
   string group=drawingPrefix+"F_"+(string)(long)t;
   DrawTrend(group+"_H",t,t+300,r.anchorHigh,clrGray,STYLE_DOT);
   DrawTrend(group+"_L",t,t+300,r.anchorLow,clrGray,STYLE_DOT);
   DrawTrend(group+"_382",t,t+300,r.fib,clrOrange,STYLE_SOLID);
   int n=ArraySize(fibGroups); ArrayResize(fibGroups,n+1); fibGroups[n]=group;
   if(n+1>100) { ObjectDelete(0,fibGroups[0]+"_H"); ObjectDelete(0,fibGroups[0]+"_L"); ObjectDelete(0,fibGroups[0]+"_382"); for(int j=1;j<n+1;j++) fibGroups[j-1]=fibGroups[j]; ArrayResize(fibGroups,n); }
}
void DrawStudy(datetime t,AlgoResult &r) {
   double risk=MathAbs(r.entry-r.signalStop); if(risk<=0) return;
   int dir=r.buy?1:-1; string group=drawingPrefix+"T_"+(string)(long)t;
   string names[]={"ENTRY","STOP","2R","3R","4R","5R","7R"};
   double prices[7]; prices[0]=r.entry; prices[1]=r.signalStop; prices[2]=r.entry+dir*risk*2; prices[3]=r.entry+dir*risk*3; prices[4]=r.entry+dir*risk*4; prices[5]=r.entry+dir*risk*5; prices[6]=r.entry+dir*risk*7;
   color cols[]={clrAqua,clrRed,clrYellow,clrLime,clrGreen,clrDodgerBlue,clrMagenta};
   datetime end=t+(datetime)(StudyWidth*60);
   for(int j=0;j<7;j++) {
      string name=group+"_"+names[j]; DrawTrend(name,t,end,prices[j],cols[j],STYLE_DOT);
      string label=name+"_TXT";
      if(ObjectCreate(0,label,OBJ_TEXT,0,end,prices[j])) { ObjectSetString(0,label,OBJPROP_TEXT,names[j]); ObjectSetInteger(0,label,OBJPROP_COLOR,cols[j]); ObjectSetInteger(0,label,OBJPROP_FONTSIZE,8); }
   }
   int n=ArraySize(levelGroups); ArrayResize(levelGroups,n+1); levelGroups[n]=group;
   if(n+1>MaxStudySets) {
      for(int j=0;j<7;j++) { string old=levelGroups[0]+"_"+names[j]; ObjectDelete(0,old); ObjectDelete(0,old+"_TXT"); }
      for(int j=1;j<n+1;j++) levelGroups[j-1]=levelGroups[j]; ArrayResize(levelGroups,n);
   }
}
void DrawVisual(const MqlRates &m1[],int i,AlgoResult &r) {
   if(!ShowVisualStudy || !MQLInfoInteger(MQL_VISUAL_MODE)) return;
   datetime t=m1[i].time;
   if(r.m1High && i>=PivotRight) DrawDot("M1H",m1[i-PivotRight].time,r.pivotHigh,clrTomato);
   if(r.m1Low && i>=PivotRight) DrawDot("M1L",m1[i-PivotRight].time,r.pivotLow,clrLimeGreen);
   if(r.m5High) DrawDot("M5H",t,r.m5PivotHigh,clrMagenta);
   if(r.m5Low) DrawDot("M5L",t,r.m5PivotLow,clrDodgerBlue);
   if(r.choch && r.chochAnchorTime>0) {
      string name=drawingPrefix+"C_"+(string)(long)t;
      DrawTrend(name,r.chochAnchorTime,t,r.chochLevel,clrAqua,STYLE_DASH);
      Remember(breakNames,name,100);
   }
   if((long)t%300==0) DrawFib(t,r);
   if(r.buy || r.sell) DrawStudy(t,r);
   ChartRedraw();
}


int OnInit() {
   if(!MQLInfoInteger(MQL_TESTER)) { Print("Algo V1 is restricted to Strategy Tester. No live or demo operation."); return INIT_FAILED; }
   if(_Period!=PERIOD_M1 || PivotLeft<1 || PivotLeft>20 || PivotRight<1 || PivotRight>20 || M5Expiry<1 || M1Expiry<1 || StopBufferTicks<0 || HistoryM1<100 || HistoryM1>50000 || StudyWidth<1 || StudyWidth>500 || MaxStudySets<1 || MaxStudySets>60 || Lots<=0 || MagicNumber<=0) return INIT_PARAMETERS_INCORRECT;
   if(PositionsTotal()>0) { Print("Start with a flat tester account; existing positions are unsupported."); return INIT_FAILED; }
   OpenDealLog();
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetTypeFillingBySymbol(_Symbol);
   lastM1=iTime(_Symbol,PERIOD_M1,0);
   Print("Algo V1 research tester initialized. Native fills can differ from virtual replay. Orders enabled: ",EnableTesterOrders);
   return INIT_SUCCEEDED;
}
// Fail closed when this session cannot identify the original entry risk.
void ManageBreakeven() {
   if(!EnableTesterOrders || BreakevenR==BE_OFF || !MQLInfoInteger(MQL_TESTER)) return;
   if(!PositionSelect(_Symbol) || PositionGetInteger(POSITION_MAGIC)!=MagicNumber) { trackedTicket=0; initialRisk=0; beMoved=false; return; }
   ulong ticket=(ulong)PositionGetInteger(POSITION_TICKET);
   if(ticket!=trackedTicket || initialRisk<=0) return;
   if(beMoved) return;
   double entry=PositionGetDouble(POSITION_PRICE_OPEN), tp=PositionGetDouble(POSITION_TP);
   long side=PositionGetInteger(POSITION_TYPE);
   MqlTick quote; if(!SymbolInfoTick(_Symbol,quote)) return;
   bool triggered=side==POSITION_TYPE_BUY ? quote.bid>=entry+initialRisk*(double)BreakevenR : quote.ask<=entry-initialRisk*(double)BreakevenR;
   if(triggered) {
      if(trade.PositionModify(ticket,entry,tp) && (trade.ResultRetcode()==TRADE_RETCODE_DONE || trade.ResultRetcode()==TRADE_RETCODE_NO_CHANGES)) beMoved=true;
      else Print("BE modification failed; broker stop/freeze constraints may apply: ",trade.ResultRetcode());
   }
}
bool ValidLots() {
   double minLot=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN), maxLot=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX), step=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   return step>0 && Lots>=minLot && Lots<=maxLot && MathAbs((Lots-minLot)/step-MathRound((Lots-minLot)/step))<1e-7;
}
void OnTick() {
   if(!MQLInfoInteger(MQL_TESTER)) return;
   ManageBreakeven();
   datetime now=iTime(_Symbol,PERIOD_M1,0); if(now==0 || now==lastM1) return; lastM1=now;
   MqlRates m1[],m5[]; ArraySetAsSeries(m1,false); ArraySetAsSeries(m5,false);
   int n=CopyRates(_Symbol,PERIOD_M1,0,HistoryM1,m1);
   int n5=CopyRates(_Symbol,PERIOD_M5,0,MathMax(2000,HistoryM1/5+300),m5);
   AlgoHA ha[]; AlgoResult results[]; double tick=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   if(n<2 || n5<=0 || !AlgoBuildHA(m5,ha) || !AlgoReplay(m1,ha,PivotLeft,PivotRight,M5Expiry,M1Expiry,(int)Mode,tick,StopBufferTicks,(double)TargetR,(double)BreakevenR,UseStructureExit,results)) return;
   int i=n-2;
   if(m1[i].time+60!=now) return;
   DrawVisual(m1,i,results[i]);
   if(results[i].gap) return;
   if(results[i].structureExit && EnableTesterOrders && PositionSelect(_Symbol) && PositionGetInteger(POSITION_MAGIC)==MagicNumber && (ulong)PositionGetInteger(POSITION_TICKET)==trackedTicket) {
      long side=PositionGetInteger(POSITION_TYPE);
      bool sameDirection=(results[i].structureDirection==1 && side==POSITION_TYPE_BUY) || (results[i].structureDirection==-1 && side==POSITION_TYPE_SELL);
      if(sameDirection && (!trade.PositionClose(trackedTicket) || trade.ResultRetcode()!=TRADE_RETCODE_DONE)) Print("Tester structure close failed: ",trade.ResultRetcode());
   }
   if(!(results[i].buy || results[i].sell)) return;
   Print("Algo V1 research candidate at ",TimeToString(m1[i].time),". Tester orders enabled: ",EnableTesterOrders);
   if(!EnableTesterOrders || PositionsTotal()!=0 || !ValidLots()) return;
   MqlTick quote; if(!SymbolInfoTick(_Symbol,quote) || tick<=0) return;
   bool buy=results[i].buy; double price=buy?quote.ask:quote.bid;
   double sl=buy?MathFloor(results[i].signalStop/tick)*tick:MathCeil(results[i].signalStop/tick)*tick;
   sl=NormalizeDouble(sl,_Digits);
   double distance=buy?price-sl:sl-price;
   double stopDistance=(double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL)*_Point;
   if(price<=0 || sl<=0 || distance<=0 || distance<stopDistance) { Print("Candidate skipped: invalid or broker-restricted stop."); return; }
   double target=buy?price+distance*(double)TargetR:price-distance*(double)TargetR;
   target=NormalizeDouble(buy?MathCeil(target/tick)*tick:MathFloor(target/tick)*tick,_Digits);
   if(target<=0 || (buy ? target<=price : target>=price)) { Print("Candidate skipped: invalid target."); return; }
   bool sent=buy?trade.Buy(Lots,_Symbol,0,sl,target,"Algo V1 research"):trade.Sell(Lots,_Symbol,0,sl,target,"Algo V1 research");
   if(!sent || (trade.ResultRetcode()!=TRADE_RETCODE_DONE && trade.ResultRetcode()!=TRADE_RETCODE_DONE_PARTIAL)) { Print("Tester order not confirmed: ",trade.ResultRetcode()); return; }
   if(PositionSelect(_Symbol) && PositionGetInteger(POSITION_MAGIC)==MagicNumber) {
      trackedTicket=(ulong)PositionGetInteger(POSITION_TICKET);
      initialRisk=MathAbs(PositionGetDouble(POSITION_PRICE_OPEN)-PositionGetDouble(POSITION_SL));
      beMoved=false;
   } else Print("Position could not be identified: automatic BE is disabled for it.");
}
