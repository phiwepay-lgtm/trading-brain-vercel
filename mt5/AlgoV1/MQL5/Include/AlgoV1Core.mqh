// Algo V1 provisional price-action engine. No orders are placed by this file.
// Uncompiled research draft. M5 HA is seeded from the oldest copied M5 bar.
#ifndef ALGOV1_CORE_MQH
#define ALGOV1_CORE_MQH
struct AlgoHA { datetime time; double open,high,low,close; };
struct AlgoResult {
   bool buy,sell,choch,be,stopHit,targetHit,structureExit,gap,m5High,m5Low,m1High,m1Low,touch;
   int structureDirection;
   double pivotHigh,pivotLow,m5PivotHigh,m5PivotLow,fib,anchorHigh,anchorLow,chochLevel,entry,stop,target,signalStop,protectedPivot;
   datetime chochAnchorTime;
};

bool AlgoBuildHA(const MqlRates &rates[], AlgoHA &a[]) {
   int n=ArraySize(rates); if(n<4) return false;
   ArrayResize(a,n);
   for(int i=0;i<n;i++) {
      a[i].time=rates[i].time;
      a[i].close=(rates[i].open+rates[i].high+rates[i].low+rates[i].close)/4.0;
      a[i].open=i==0 ? (rates[i].open+rates[i].close)/2.0 : (a[i-1].open+a[i-1].close)/2.0;
      a[i].high=MathMax(rates[i].high,MathMax(a[i].open,a[i].close));
      a[i].low=MathMin(rates[i].low,MathMin(a[i].open,a[i].close));
   }
   return true;
}
// Confirm pivots only after all right-hand candles have closed. Equal-pivot
// tie handling is provisional and may differ from TradingView.
bool AlgoHAPivot(const AlgoHA &a[],int i,int l,int r,bool high,double &value) {
   int p=i-r; if(p<l || i>=ArraySize(a)) return false;
   value=high?a[p].high:a[p].low;
   for(int j=1;j<=l;j++) if(high ? value<=a[p-j].high : value>=a[p-j].low) return false;
   for(int j=1;j<=r;j++) if(high ? value<a[p+j].high : value>a[p+j].low) return false;
   return true;
}
bool AlgoM1Pivot(const MqlRates &a[],int i,int l,int r,bool high,double &value) {
   int p=i-r; if(p<l || i>=ArraySize(a)) return false;
   value=high?a[p].high:a[p].low;
   for(int j=1;j<=l;j++) if(high ? value<=a[p-j].high : value>=a[p-j].low) return false;
   for(int j=1;j<=r;j++) if(high ? value<a[p+j].high : value>a[p+j].low) return false;
   return true;
}
class CAlgoV1 {
private:
   int l,r,m5Expiry,m1Expiry,mode,trend,touchedAt,phase,direction,waitFrom,tradeDir,entryBar;
   double tick,stopBuffer,targetR,beR,haHigh,haLow,legHigh,legLow,m1High,m1Low,previousM1High,previousM1Low,entry,stop,target,risk,protectedLevel;
   bool hasHaHigh,hasHaLow,hasM1High,hasM1Low,hasPreviousHigh,hasPreviousLow,touched,attempted,beArmed,useStructure,hasProtected;
   datetime m1HighTime,m1LowTime;
public:
   void Init(int pl,int pr,int exp5,int exp1,int selectMode,double tickSize,int buffer,double rr,double be,bool structureEnabled) {
      l=pl; r=pr; m5Expiry=exp5; m1Expiry=exp1; mode=selectMode; tick=tickSize; stopBuffer=buffer; targetR=rr; beR=be; useStructure=structureEnabled; hasProtected=false; protectedLevel=0;
      trend=0; touchedAt=-1; phase=0; direction=0; waitFrom=0; tradeDir=0; entryBar=-1;
      haHigh=0; haLow=0; legHigh=0; legLow=0; m1High=0; m1Low=0; previousM1High=0; previousM1Low=0; entry=0; stop=0; target=0; risk=0;
      m1HighTime=0; m1LowTime=0;
      hasHaHigh=false; hasHaLow=false; hasM1High=false; hasM1Low=false; hasPreviousHigh=false; hasPreviousLow=false; touched=false; attempted=false; beArmed=false;
   }
   int M5(const AlgoHA &a[],int i,bool &touchEvent,bool &pivotH,bool &pivotL,double &pvH,double &pvL) {
      touchEvent=false; pivotH=AlgoHAPivot(a,i,l,r,true,pvH); pivotL=AlgoHAPivot(a,i,l,r,false,pvL);
      if(pivotH) { haHigh=pvH; hasHaHigh=true; }
      if(pivotL) { haLow=pvL; hasHaLow=true; }
      if(i<1) return 0;
      bool up=hasHaHigh && hasHaLow && a[i].close>haHigh && a[i-1].close<=haHigh;
      bool down=hasHaHigh && hasHaLow && a[i].close<haLow && a[i-1].close>=haLow;
      int event=0;
      if(up && (trend==0 || (trend==-1 && !touched))) { trend=1; legLow=haLow; legHigh=a[i].high; touched=false; attempted=false; }
      else if(down && (trend==0 || (trend==1 && !touched))) { trend=-1; legHigh=haHigh; legLow=a[i].low; touched=false; attempted=false; }
      else if(trend!=0 && legHigh>legLow) {
         if(!touched) {
            bool newExtreme=trend==1 ? a[i].high>legHigh : a[i].low<legLow;
            if(trend==1) legHigh=MathMax(legHigh,a[i].high); else legLow=MathMin(legLow,a[i].low);
            double fib=trend==1 ? legHigh-(legHigh-legLow)*0.382 : legLow+(legHigh-legLow)*0.382;
            bool noPivotTouch=trend==1 ? a[i].high<legHigh : a[i].low>legLow;
            if(!newExtreme && noPivotTouch && a[i].low<=fib && a[i].high>=fib) { touched=true; touchedAt=i; touchEvent=true; }
         } else if(i>touchedAt) {
            if(i-touchedAt>m5Expiry) { trend=0; touched=false; attempted=false; }
            else {
               bool breakTrend=trend==1 ? a[i].close>legHigh : a[i].close<legLow;
               bool fail=trend==1 ? attempted && a[i].high<legHigh && a[i].close<a[i].open && a[i-1].close>a[i-1].open : attempted && a[i].low>legLow && a[i].close>a[i].open && a[i-1].close<a[i-1].open;
               if(breakTrend) { event=trend; trend=0; touched=false; attempted=false; }
               else if(fail) { event=trend==1 ? -2 : 2; trend=0; touched=false; attempted=false; }
               else if((trend==1 && a[i].high>=legHigh) || (trend==-1 && a[i].low<=legLow)) { trend=0; touched=false; attempted=false; }
               else if(trend==1 && a[i].close>a[i].open && a[i].high>a[i-1].high && a[i].high<legHigh) attempted=true;
               else if(trend==-1 && a[i].close<a[i].open && a[i].low<a[i-1].low && a[i].low>legLow) attempted=true;
            }
         }
      }
      return event;
   }
   double Fib() { if(trend==1) return legHigh-(legHigh-legLow)*0.382; if(trend==-1) return legLow+(legHigh-legLow)*0.382; return 0; }
   int TrendDirection() { return trend; }
   double AnchorHigh() { return trend!=0 ? legHigh : 0; }
   double AnchorLow() { return trend!=0 ? legLow : 0; }
   void M1(const MqlRates &a[],int i,int event,int touchDirection,bool freshM5,AlgoResult &out) {
      ZeroMemory(out); double value=0;
      out.m1High=AlgoM1Pivot(a,i,l,r,true,value); if(out.m1High) { if(hasM1High) { previousM1High=m1High; hasPreviousHigh=true; } m1High=value; hasM1High=true; m1HighTime=a[i-r].time; out.pivotHigh=value; }
      out.m1Low=AlgoM1Pivot(a,i,l,r,false,value); if(out.m1Low) { if(hasM1Low) { previousM1Low=m1Low; hasPreviousLow=true; } m1Low=value; hasM1Low=true; m1LowTime=a[i-r].time; out.pivotLow=value; }
      out.fib=Fib(); if(i<1) return;
      if(a[i].time-a[i-1].time!=60) { out.gap=true; phase=0; tradeDir=0; entry=0; stop=0; target=0; risk=0; beArmed=false; hasProtected=false; return; }
      if(tradeDir!=0 && i>entryBar) {
         // Protect a post-entry higher low or lower high only when confirmed.
         if(useStructure && i-r>=entryBar) {
            if(tradeDir==1 && out.m1Low && hasPreviousLow && m1Low>previousM1Low && (!hasProtected || m1Low>protectedLevel)) { protectedLevel=m1Low; hasProtected=true; }
            if(tradeDir==-1 && out.m1High && hasPreviousHigh && m1High<previousM1High && (!hasProtected || m1High<protectedLevel)) { protectedLevel=m1High; hasProtected=true; }
         }
         bool sl=tradeDir==1 ? a[i].low<=stop : a[i].high>=stop;
         bool tp=tradeDir==1 ? a[i].high>=target : a[i].low<=target;
         if(sl || tp) { out.stopHit=sl; out.targetHit=!sl && tp; tradeDir=0; entry=0; stop=0; target=0; risk=0; beArmed=false; hasProtected=false; }
         else if(useStructure && hasProtected && (tradeDir==1 ? a[i].close<protectedLevel : a[i].close>protectedLevel)) { out.structureExit=true; out.structureDirection=tradeDir; tradeDir=0; entry=0; stop=0; target=0; risk=0; beArmed=false; hasProtected=false; }
         else if(!beArmed && beR>0 && (tradeDir==1 ? a[i].high>=entry+risk*beR : a[i].low<=entry-risk*beR)) { stop=entry; beArmed=true; out.be=true; }
      }
      if(phase!=0 && i-waitFrom>m1Expiry) phase=0;
      bool retestSelected=touchDirection!=0 && (mode==0 || mode==1);
      bool ftbSelected=MathAbs(event)==2 && (mode==0 || mode==2);
      if(freshM5 && (retestSelected || ftbSelected) && tradeDir==0) { direction=ftbSelected ? (event>0?1:-1) : touchDirection; phase=1; waitFrom=i; }
      else if(phase==1 && i>waitFrom && (direction==1 ? hasM1High && hasPreviousHigh && m1High<previousM1High && a[i].close>m1High && a[i-1].close<=m1High : hasM1Low && hasPreviousLow && m1Low>previousM1Low && a[i].close<m1Low && a[i-1].close>=m1Low)) { phase=2; waitFrom=i; out.choch=true; out.chochLevel=direction==1 ? m1High : m1Low; out.chochAnchorTime=direction==1 ? m1HighTime : m1LowTime; }
      else if(phase==2 && i>waitFrom) {
         bool bull=a[i].close>a[i].open && a[i-1].close<a[i-1].open && a[i].open<=a[i-1].close && a[i].close>=a[i-1].open;
         bool bear=a[i].close<a[i].open && a[i-1].close>a[i-1].open && a[i].open>=a[i-1].close && a[i].close<=a[i-1].open;
         if(i==waitFrom+1 && (direction==1 ? bull : bear)) {
            double candidate=direction==1 ? m1Low-stopBuffer*tick : m1High+stopBuffer*tick;
            double candidateRisk=direction==1 ? a[i].close-candidate : candidate-a[i].close;
            if(tradeDir==0 && (direction==1 ? hasM1Low : hasM1High) && candidateRisk>0) {
               out.buy=direction==1; out.sell=direction==-1; entry=a[i].close; stop=candidate; risk=candidateRisk;
               target=direction==1 ? entry+risk*targetR : entry-risk*targetR;
               tradeDir=direction; entryBar=i; beArmed=false; hasProtected=false; out.signalStop=stop;
            }
         }
         phase=0; // An engulf must occur on the immediate next bar.
      }
      if(tradeDir!=0) { out.entry=entry; out.stop=stop; out.target=target; if(hasProtected) out.protectedPivot=protectedLevel; }
   }
};
// Replay only completed M1 bars. M5 events become available on the first M1
// bar in the following five-minute period. No broker trades are sent here.
bool AlgoReplay(const MqlRates &m1[],const AlgoHA &m5[],int left,int right,int expiry5,int expiry1,int mode,double tick,int buffer,double rr,double be,bool structureEnabled,AlgoResult &results[]) {
   int n=ArraySize(m1), n5=ArraySize(m5); if(n<left+right+4 || n5<left+right+4 || tick<=0) return false;
   ArrayResize(results,n); CAlgoV1 core; core.Init(left,right,expiry5,expiry1,mode,tick,buffer,rr,be,structureEnabled);
   int j=0;
   for(int i=0;i<n-1;i++) {
      int event=0, touchDirection=0; bool fresh=false, touch=false, ph=false, pl=false; double vph=0,vpl=0;
      while(j<n5 && m5[j].time+300<=m1[i].time) {
         bool t=false,h=false,l=false; double hv=0,lv=0;
         int e=core.M5(m5,j,t,h,l,hv,lv);
         if(m5[j].time+300==m1[i].time) { event=e; fresh=true; touch=t; touchDirection=t ? core.TrendDirection() : 0; ph=h; pl=l; vph=hv; vpl=lv; }
         j++;
      }
      core.M1(m1,i,event,touchDirection,fresh,results[i]);
      results[i].anchorHigh=core.AnchorHigh(); results[i].anchorLow=core.AnchorLow();
      results[i].touch=touch; results[i].m5High=ph; results[i].m5Low=pl; results[i].m5PivotHigh=vph; results[i].m5PivotLow=vpl;
   }
   ZeroMemory(results[n-1]); return true;
}
#endif
