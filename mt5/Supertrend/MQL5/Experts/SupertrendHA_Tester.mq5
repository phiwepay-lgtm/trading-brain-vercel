// Research adaptation of the user's Supertrend Pine script; MPL-2.0.
// https://mozilla.org/MPL/2.0/
// TESTER ONLY. Prototype, not a full port and not for live or demo trading.
#property version "0.10"
#property strict
#include <Trade/Trade.mqh>
#include "STCore.mqh"

input bool EnableTesterOrders=false;       // OFF by default; tester only
input double Lots=0.01;                    // Fixed volume; no risk-percent sizing
input ulong Magic=801042;
input int HistoryBars=5000;                // Bounded replay; changes warm-up/results
input double Factor=2.5;
input int ATRPeriod=14;
input int ADXLength=14;
input int ADXSmoothing=14;
input bool UseADXFilter=false;
input double SignalADXThreshold=50.0;       // Strictly greater, as in Pine
input bool UseEMA200Filter=false;
input double StopATR=1.5;
input double TP1_R=1.0;
input double TP2_R=2.0;
input double TP3_R=3.0;
input int SlippagePoints=20;
input bool DrawLevels=true;

CTrade trader;
datetime processedBar=0;
string objPrefix="ST_HA_RESEARCH_";
string orderStatus="Orders disabled";

// Broker volume must match exact step; do not silently increase exposure.
bool ValidLots() {
   double minVol=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN), maxVol=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX), step=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   if(step<=0 || Lots<minVol || Lots>maxVol) return false;
   return MathAbs(Lots/step-MathRound(Lots/step))<1e-7;
}
bool HasSymbolExposure() {
   for(int i=PositionsTotal()-1;i>=0;--i) {
      ulong ticket=PositionGetTicket(i);
      if(ticket!=0 && PositionGetString(POSITION_SYMBOL)==_Symbol) return true;
   }
   for(int i=OrdersTotal()-1;i>=0;--i) {
      ulong ticket=OrderGetTicket(i);
      if(ticket!=0 && OrderGetString(ORDER_SYMBOL)==_Symbol) return true;
   }
   return false;
}
void HLine(const string name,const double price,const color col) {
   string id=objPrefix+name;
   if(ObjectFind(0,id)<0) ObjectCreate(0,id,OBJ_HLINE,0,0,price);
   ObjectSetDouble(0,id,OBJPROP_PRICE,price);
   ObjectSetInteger(0,id,OBJPROP_COLOR,col);
   ObjectSetInteger(0,id,OBJPROP_STYLE,STYLE_DASH);
   ObjectSetInteger(0,id,OBJPROP_WIDTH,1);
   ObjectSetInteger(0,id,OBJPROP_SELECTABLE,false);
}
void ClearLevels() {
   ObjectDelete(0,objPrefix+"Entry"); ObjectDelete(0,objPrefix+"SL");
   ObjectDelete(0,objPrefix+"TP1"); ObjectDelete(0,objPrefix+"TP2"); ObjectDelete(0,objPrefix+"TP3");
}
bool IsSignalAllowed(const STPoint &p,const bool buy) {
   if(UseADXFilter && (!p.adx_ready || p.adx<=SignalADXThreshold)) return false;
   if(UseEMA200Filter && (buy ? p.close<=p.ema200 : p.close>=p.ema200)) return false;
   return true;
}

int OnInit() {
   if(!MQLInfoInteger(MQL_TESTER)) { Print("SupertrendHA_Tester is restricted to the MT5 Strategy Tester."); return INIT_FAILED; }
   if(_Period!=PERIOD_M1) { Print("Select M1 in Strategy Tester."); return INIT_FAILED; }
   if(Factor<=0 || ATRPeriod<1 || ADXLength<1 || ADXSmoothing<1 || HistoryBars<500 || HistoryBars>50000 ||
      StopATR<=0 || TP1_R<=0 || TP2_R<=0 || TP3_R<=0 || SignalADXThreshold<0 || SlippagePoints<0 || (EnableTesterOrders && !ValidLots())) {
      Print("Invalid inputs or fixed lot size; check symbol volume limits and step."); return INIT_PARAMETERS_INCORRECT;
   }
   trader.SetExpertMagicNumber(Magic);
   trader.SetDeviationInPoints(SlippagePoints);
   if(EnableTesterOrders && !trader.SetTypeFillingBySymbol(_Symbol)) { Print("Unsupported filling policy for symbol."); return INIT_FAILED; }
   if(EnableTesterOrders) orderStatus="Tester orders enabled";
   return INIT_SUCCEEDED;
}
void OnDeinit(const int reason) { ClearLevels(); Comment(""); }

void TryOrder(const STPoint &p,const bool buy) {
   if(!EnableTesterOrders || !MQLInfoInteger(MQL_TESTER)) return;
   if(HasSymbolExposure()) { orderStatus="Skipped: existing symbol position/order"; Print(orderStatus); return; }
   if(!ValidLots()) { orderStatus="Skipped: invalid lot size"; Print(orderStatus); return; }
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol,tick) || tick.ask<=0 || tick.bid<=0 || tick.ask<tick.bid) { orderStatus="Skipped: invalid broker tick"; Print(orderStatus); return; }
   double risk=p.atr*StopATR;
   if(!MathIsValidNumber(risk) || risk<=0) { orderStatus="Skipped: invalid HA ATR"; Print(orderStatus); return; }
   // The order is filled at real executable prices, never synthetic HA close.
   double entry=buy ? tick.ask : tick.bid;
   double step=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   if(step<=0) { orderStatus="Skipped: invalid tick size"; Print(orderStatus); return; }
   // Round conservatively away from current price, in broker tick increments.
   double sl=buy ? MathFloor((entry-risk)/step)*step : MathCeil((entry+risk)/step)*step;
   double tp=buy ? MathCeil((entry+risk*TP1_R)/step)*step : MathFloor((entry-risk*TP1_R)/step)*step;
   sl=NormalizeDouble(sl,_Digits); tp=NormalizeDouble(tp,_Digits);
   double minDistance=SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL)*_Point;
   if(sl<=0 || tp<=0 || (buy && (sl>=tick.bid || tp<=tick.bid || tick.bid-sl<minDistance || tp-tick.bid<minDistance)) ||
      (!buy && (sl<=tick.ask || tp>=tick.ask || sl-tick.ask<minDistance || tick.ask-tp<minDistance))) {
      orderStatus="Skipped: broker stop distance"; Print(orderStatus); return;
   }
   bool sent=buy ? trader.Buy(Lots,_Symbol,0,sl,tp,"ST HA research TP1") : trader.Sell(Lots,_Symbol,0,sl,tp,"ST HA research TP1");
   uint rc=trader.ResultRetcode();
   if(!sent || (rc!=TRADE_RETCODE_DONE && rc!=TRADE_RETCODE_DONE_PARTIAL)) {
      orderStatus="Order rejected: "+IntegerToString((int)rc)+" "+trader.ResultRetcodeDescription();
   } else orderStatus="Tester order accepted; broker fill may differ";
   Print(orderStatus);
}
void OnTick() {
   if(_Period!=PERIOD_M1 || !MQLInfoInteger(MQL_TESTER)) return;
   MqlRates bars[];
   ArraySetAsSeries(bars,false);
   int count=CopyRates(_Symbol,PERIOD_M1,1,HistoryBars,bars);
   if(count<500) { Comment("SUPERTREND HA RESEARCH — TESTER ONLY\nWaiting for at least 500 completed M1 bars.\nNo live/demo orders."); return; }
   datetime latest=bars[count-1].time;
   if(latest==processedBar) return;
   // Avoid processing on a partial download or silently replaying backwards.
   if(processedBar!=0 && latest<processedBar) { orderStatus="Data moved backwards; EA stopped"; ExpertRemove(); return; }
   bool firstRun=(processedBar==0);
   processedBar=latest;
   STCore state; STInit(state,Factor,ATRPeriod,ADXLength,ADXSmoothing);
   STPoint p; STPoint lastSignal; bool foundSignal=false; bool latestBuy=false,latestSell=false;
   int signals=0;
   for(int i=0;i<count;i++) {
      STBar b; b.open=bars[i].open; b.high=bars[i].high; b.low=bars[i].low; b.close=bars[i].close;
      STUpdate(state,b,p);
      bool buy=p.ready && p.buy && IsSignalAllowed(p,true);
      bool sell=p.ready && p.sell && IsSignalAllowed(p,false);
      if(buy || sell) { signals++; lastSignal=p; foundSignal=true; }
      if(i==count-1) { latestBuy=buy; latestSell=sell; }
   }
   if(!p.ready) { Comment("SUPERTREND HA RESEARCH — waiting for ATR data"); return; }
   if(DrawLevels && foundSignal && lastSignal.atr>0) {
      int dir=lastSignal.direction<0 ? 1 : -1;
      double risk=lastSignal.atr*StopATR;
      HLine("Entry",lastSignal.close,clrDodgerBlue); HLine("SL",lastSignal.close-dir*risk,clrTomato);
      HLine("TP1",lastSignal.close+dir*risk*TP1_R,clrSeaGreen); HLine("TP2",lastSignal.close+dir*risk*TP2_R,clrGreen);
      HLine("TP3",lastSignal.close+dir*risk*TP3_R,clrDarkGreen);
   } else ClearLevels();
   if(!firstRun && (latestBuy || latestSell)) TryOrder(p,latestBuy);
   string text="SUPERTREND HA RESEARCH — TESTER ONLY\n";
   text+="M1 synthetic Heikin Ashi | completed bars | "+_Symbol+"\n";
   text+="Trend: "+(p.direction<0 ? "UP" : "DOWN")+" | HA close: "+DoubleToString(p.close,_Digits)+"\n";
   text+="HA Supertrend: "+DoubleToString(p.supertrend,_Digits)+" | HA ATR: "+DoubleToString(p.atr,_Digits)+"\n";
   text+="ADX: "+(p.adx_ready ? DoubleToString(p.adx,1) : "warming up")+" | EMA200: "+DoubleToString(p.ema200,_Digits)+"\n";
   text+="Latest signal: "+(latestBuy ? "BUY" : latestSell ? "SELL" : "none")+" | replay signals: "+IntegerToString(signals)+"\n";
   text+="Lines: HA-close study levels; native orders use broker prices, SL and TP1 only.\n";
   text+=orderStatus+"\nNOT a full Pine port. No live/demo orders. Verify in Strategy Tester.";
   Comment(text);
}
