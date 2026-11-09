#include <algorithm>
#include <cassert>
#include <cmath>
#include <iostream>
#define MathMax(a,b) std::max((a),(b))
#define MathMin(a,b) std::min((a),(b))
#define MathAbs(a) std::fabs(a)
#include "../mt5/Supertrend/MQL5/Experts/STCore.mqh"
static bool near(double a,double b) { return std::fabs(a-b)<1e-9; }
int main() {
    STRma r; RmaInit(r,3); RmaStep(r,1); RmaStep(r,2); assert(!r.ready); RmaStep(r,3);
    assert(r.ready && near(r.value,2)); RmaStep(r,5); assert(near(r.value,3));
    STCore c; STInit(c,2.5,3,3,3); STPoint p;
    STBar b1{10,12,8,11}; STUpdate(c,b1,p);
    assert(near(p.open,10.5) && near(p.close,10.25) && near(p.high,12) && near(p.low,8));
    assert(!p.ready && !p.buy && !p.sell);
    STBar b2{11,13,10,12}; STUpdate(c,b2,p);
    assert(near(p.open,10.375) && near(p.close,11.5));
    assert(!p.ready && !p.buy && !p.sell);
    STBar b3{12,14,11,13}; STUpdate(c,b3,p);
    assert(p.ready && p.direction==1 && !p.buy && !p.sell && p.atr>0);
    int buys=0,sells=0; double last=13;
    for(int i=0;i<120;i++) {
      double next=last+(i<35?1.0:i<80?-1.0:1.0);
      STBar b{last,std::max(last,next)+0.2,std::min(last,next)-0.2,next};
      STUpdate(c,b,p); buys+=p.buy; sells+=p.sell;
      assert(!(p.buy && p.sell)); assert(p.atr>=0); last=next;
    }
    assert(buys>=1 && sells>=1 && p.adx_ready && p.adx>=0 && p.adx<=100);
    std::cout << "Synthetic HA, Wilder smoothing and trend reversal checks passed.\n";
}
