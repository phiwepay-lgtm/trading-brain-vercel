// Heikin Ashi / Supertrend research core. Based on the user's MPL-2.0 Pine
// script; this adaptation remains subject to MPL 2.0.
// https://mozilla.org/MPL/2.0/
#ifndef SUPER_TREND_HA_CORE_MQH
#define SUPER_TREND_HA_CORE_MQH

struct STBar { double open, high, low, close; };
struct STPoint {
   double open,high,low,close,atr,supertrend,ema200,adx;
   int direction;
   bool ready, adx_ready, buy, sell;
};
struct STRma {
   int length,count;
   double sum,value;
   bool ready;
};
void RmaInit(STRma &r,const int period) { r.length=period; r.count=0; r.sum=0; r.value=0; r.ready=false; }
void RmaStep(STRma &r,const double value) {
   if(!r.ready) { r.sum+=value; r.count++; if(r.count>=r.length) { r.value=r.sum/r.length; r.ready=true; } }
   else r.value=(r.value*(r.length-1)+value)/r.length;
}
struct STCore {
   int bars,direction;
   double factor,ha_open,ha_high,ha_low,ha_close,upper,lower,trend,ema200;
   bool has_ha,has_trend;
   STRma atr,di_tr,plus_dm,minus_dm,adx;
};
void STInit(STCore &s,const double factor,const int atr_period,const int di_period,const int adx_period) {
   s.bars=0; s.direction=1; s.factor=factor; s.ha_open=0; s.ha_high=0; s.ha_low=0; s.ha_close=0;
   s.upper=0; s.lower=0; s.trend=0; s.ema200=0; s.has_ha=false; s.has_trend=false;
   RmaInit(s.atr,atr_period); RmaInit(s.di_tr,di_period); RmaInit(s.plus_dm,di_period);
   RmaInit(s.minus_dm,di_period); RmaInit(s.adx,adx_period);
}
void STUpdate(STCore &s,const STBar &raw,STPoint &out) {
   const double c=(raw.open+raw.high+raw.low+raw.close)/4.0;
   const double o=s.has_ha ? (s.ha_open+s.ha_close)/2.0 : (raw.open+raw.close)/2.0;
   const double h=MathMax(raw.high,MathMax(o,c)), l=MathMin(raw.low,MathMin(o,c));
   const double tr=s.has_ha ? MathMax(h-l,MathMax(MathAbs(h-s.ha_close),MathAbs(l-s.ha_close))) : h-l;
   RmaStep(s.atr,tr); RmaStep(s.di_tr,tr);
   if(s.has_ha) {
      const double up=h-s.ha_high, down=s.ha_low-l;
      RmaStep(s.plus_dm,up>down && up>0 ? up : 0);
      RmaStep(s.minus_dm,down>up && down>0 ? down : 0);
   }
   if(s.di_tr.ready && s.plus_dm.ready && s.minus_dm.ready) {
      const double sum=s.plus_dm.value+s.minus_dm.value;
      RmaStep(s.adx,sum>0 ? 100.0*MathAbs(s.plus_dm.value-s.minus_dm.value)/sum : 0.0);
   }
   s.ema200=s.has_ha ? (2.0/201.0)*c+(199.0/201.0)*s.ema200 : c;
   out.open=o; out.high=h; out.low=l; out.close=c; out.atr=s.atr.ready ? s.atr.value : 0;
   out.ema200=s.ema200; out.adx=s.adx.ready ? s.adx.value : 0; out.adx_ready=s.adx.ready;
   out.buy=false; out.sell=false; out.ready=false; out.direction=0; out.supertrend=0;
   if(s.atr.ready) {
      const double mid=(h+l)/2.0;
      double upper=mid+s.factor*s.atr.value, lower=mid-s.factor*s.atr.value;
      int direction=1;
      if(s.has_trend) {
         upper=(upper<s.upper || s.ha_close>s.upper) ? upper : s.upper;
         lower=(lower>s.lower || s.ha_close<s.lower) ? lower : s.lower;
         direction=(s.trend==s.upper) ? (c>upper ? -1 : 1) : (c<lower ? 1 : -1);
         out.buy=(s.direction>0 && direction<0);
         out.sell=(s.direction<0 && direction>0);
      }
      s.upper=upper; s.lower=lower; s.direction=direction; s.trend=direction<0 ? lower : upper; s.has_trend=true;
      out.ready=true; out.direction=direction; out.supertrend=s.trend;
   }
   s.ha_open=o; s.ha_high=h; s.ha_low=l; s.ha_close=c; s.has_ha=true; s.bars++;
}
#endif
