//+------------------------------------------------------------------+
//| Trading Brain EA - sample integration, disabled by default        |
//| Chart AI assessments are NOT signals. Test on demo before use.   |
//+------------------------------------------------------------------+
#property strict
#property version "1.00"
#include <Trade/Trade.mqh>

input double Lots = 0.1;
input ulong Magic = 12345;
input string API_URL = "https://trading-brain-vercel.vercel.app";
input bool EnableTrading = false; // Explicit opt-in. Never enabled by install.
input bool DemoOnly = true;       // Additional opt-in required for live accounts.
input int MaxSpreadPoints = 30;
input int PollSeconds = 15;
input int MaxSignalLifetimeSeconds = 300;

CTrade trade;
uint last_poll = 0;

// Read a unique flat JSON field. Nested/escaped/duplicate data is not supported:
// an incompatible response is rejected rather than guessed.
bool FieldStart(const string json,const string key,int &pos)
{
   string needle="\""+key+"\"";
   int at=StringFind(json,needle);
   if(at<0 || StringFind(json,needle,at+StringLen(needle))>=0) return false;
   pos=at+StringLen(needle);
   while(pos<StringLen(json) && StringGetCharacter(json,pos)<=32) pos++;
   if(pos>=StringLen(json) || StringGetCharacter(json,pos)!=':') return false;
   pos++;
   while(pos<StringLen(json) && StringGetCharacter(json,pos)<=32) pos++;
   return pos<StringLen(json);
}
bool FieldString(const string json,const string key,string &value)
{
   int pos;
   if(!FieldStart(json,key,pos) || StringGetCharacter(json,pos)!='\"') return false;
   int end=StringFind(json,"\"",pos+1);
   if(end<0) return false;
   value=StringSubstr(json,pos+1,end-pos-1);
   if(StringFind(value,"\\")>=0) return false;
   int next=end+1;
   while(next<StringLen(json) && StringGetCharacter(json,next)<=32) next++;
   return next<StringLen(json) && (StringGetCharacter(json,next)==',' || StringGetCharacter(json,next)=='}');
}
bool FieldNumber(const string json,const string key,double &value)
{
   int pos;
   if(!FieldStart(json,key,pos)) return false;
   int end=pos;
   bool digit=false, decimal=false;
   if(StringGetCharacter(json,end)=='-') end++;
   while(end<StringLen(json))
   {
      ushort c=StringGetCharacter(json,end);
      if(c>='0' && c<='9') { digit=true; end++; continue; }
      if(c=='.' && !decimal) { decimal=true; end++; continue; }
      break;
   }
   if(!digit) return false;
   string text=StringSubstr(json,pos,end-pos);
   while(end<StringLen(json) && StringGetCharacter(json,end)<=32) end++;
   if(end>=StringLen(json) || (StringGetCharacter(json,end)!=',' && StringGetCharacter(json,end)!='}')) return false;
   value=StringToDouble(text);
   return MathIsValidNumber(value);
}

bool HasPositionForSymbol()
{
   // Do not open on a symbol already occupied by this or another strategy.
   for(int i=PositionsTotal()-1;i>=0;i--)
   {
      ulong ticket=PositionGetTicket(i);
      if(ticket>0 && PositionGetString(POSITION_SYMBOL)==_Symbol) return true;
   }
   return false;
}
bool ValidVolume(const double volume)
{
   double min=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN);
   double max=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX);
   double step=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   if(step<=0 || volume<min || volume>max) return false;
   return MathAbs((volume-min)/step-MathRound((volume-min)/step))<0.000001;
}

void OnTick()
{
   uint now=GetTickCount();
   uint interval=(uint)MathMax(PollSeconds,5)*1000;
   if(last_poll!=0 && (uint)(now-last_poll)<interval) return;
   last_poll=now;
   if(StringFind(API_URL,"https://")!=0) { Print("Trading Brain: HTTPS API_URL required."); return; }
   string url=API_URL;
   if(StringSubstr(url,StringLen(url)-1)=="/") url=StringSubstr(url,0,StringLen(url)-1);
   url+="/api/signal";
   char post[],response[];
   string response_headers;
   ResetLastError();
   int http=WebRequest("GET",url,"Accept: application/json\r\n",5000,post,response,response_headers);
   if(http==-1) { PrintFormat("Trading Brain WebRequest failed (%d). Allow API_URL in MT5 options.",GetLastError()); return; }
   string body=CharArrayToString(response,0,WHOLE_ARRAY,CP_UTF8);
   PrintFormat("Trading Brain HTTP %d response: %s",http,body);
   if(http!=200 || StringLen(body)>8192) return;
   string action,symbol;
   if(!FieldString(body,"action",action) || (action!="BUY" && action!="SELL")) return;
   if(!EnableTrading) { Print("Trading Brain: signal ignored; EnableTrading is false."); return; }
   if(DemoOnly && AccountInfoInteger(ACCOUNT_TRADE_MODE)!=ACCOUNT_TRADE_MODE_DEMO) { Print("Trading Brain: demo accounts only."); return; }
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) || !MQLInfoInteger(MQL_TRADE_ALLOWED) || !AccountInfoInteger(ACCOUNT_TRADE_ALLOWED)) { Print("Trading Brain: automated trading not allowed."); return; }
   double confidence,sl,tp,signal_id,expires_at;
   if(!FieldString(body,"symbol",symbol) || symbol!=_Symbol || !FieldNumber(body,"confidence",confidence) || confidence<=70 || confidence>100 ||
      !FieldNumber(body,"sl",sl) || !FieldNumber(body,"tp",tp) || !FieldNumber(body,"signal_id",signal_id) || !FieldNumber(body,"expires_at",expires_at)) { Print("Trading Brain: incomplete or invalid signal."); return; }
   // Only positive integer IDs in exact-double range. Signal IDs must be unique per symbol.
   if(signal_id<1 || signal_id>9007199254740991.0 || MathFloor(signal_id)!=signal_id) return;
   datetime now_utc=TimeGMT();
   if(expires_at<=now_utc || expires_at>now_utc+MathMax(1,MaxSignalLifetimeSeconds)) { Print("Trading Brain: expired or invalid signal lifetime."); return; }
   string dedup=StringFormat("TB.%I64d.%s.%I64u",AccountInfoInteger(ACCOUNT_LOGIN),_Symbol,Magic);
   if(GlobalVariableCheck(dedup) && GlobalVariableGet(dedup)>=signal_id) { Print("Trading Brain: signal is old or already processed."); return; }
   if(HasPositionForSymbol()) { Print("Trading Brain: symbol already has an open position."); return; }
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol,tick) || tick.ask<=0 || tick.bid<=0 || _Point<=0) return;
   if(MaxSpreadPoints<0 || (tick.ask-tick.bid)/_Point>MaxSpreadPoints) { Print("Trading Brain: spread exceeds limit."); return; }
   if(!ValidVolume(Lots)) { Print("Trading Brain: invalid lot size for symbol."); return; }
   double min_stop=(double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL)*_Point;
   if(sl<=0 || tp<=0 || (action=="BUY" && (sl>=tick.bid-min_stop || tp<=tick.bid+min_stop)) ||
      (action=="SELL" && (sl<=tick.ask+min_stop || tp>=tick.ask-min_stop))) { Print("Trading Brain: invalid stop/target for current market."); return; }
   trade.SetExpertMagicNumber(Magic);
   trade.SetTypeFillingBySymbol(_Symbol);
   bool submitted=(action=="BUY") ? trade.Buy(Lots,_Symbol,0,NormalizeDouble(sl,_Digits),NormalizeDouble(tp,_Digits),"Trading Brain") : trade.Sell(Lots,_Symbol,0,NormalizeDouble(sl,_Digits),NormalizeDouble(tp,_Digits),"Trading Brain");
   uint code=trade.ResultRetcode();
   PrintFormat("Trading Brain order: submitted=%s retcode=%u %s",submitted ? "true" : "false",code,trade.ResultRetcodeDescription());
   if(submitted && (code==TRADE_RETCODE_DONE || code==TRADE_RETCODE_DONE_PARTIAL || code==TRADE_RETCODE_PLACED))
   {
      GlobalVariableSet(dedup,signal_id);
      GlobalVariablesFlush();
   }
}
