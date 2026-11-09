"""Synthetic tests of a C++-adapted copy of the shared MQL core.

This checks core state-machine behavior, not MetaEditor compilation, MT5 fills,
TradingView parity, historical accuracy, or profitability.
"""
import pathlib
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

@unittest.skipUnless(shutil.which('g++'), 'g++ unavailable for core simulation')
class AlgoCoreSyntheticTest(unittest.TestCase):
    def test_structure_exits_and_immediate_engulf(self):
        source = (ROOT / 'mt5/AlgoV1/MQL5/Include/AlgoV1Core.mqh').read_text()
        source = re.sub(r'const (MqlRates|AlgoHA) &(\w+)\[\]', r'const std::vector<\1> &\2', source)
        source = re.sub(r'(AlgoHA|AlgoResult) &(\w+)\[\]', r'std::vector<\1> &\2', source)
        preamble = r'''
#include <vector>
#include <algorithm>
#include <cmath>
#include <cassert>
using datetime = long long;
struct MqlRates { datetime time; double open, high, low, close; };
template<typename T> int ArraySize(const std::vector<T>& a) { return static_cast<int>(a.size()); }
template<typename T> void ArrayResize(std::vector<T>& a, int n) { a.resize(n); }
#define MathMax std::max
#define MathMin std::min
#define MathAbs std::abs
#define ZeroMemory(x) x={}
#define private public
'''
        harness = r'''
#undef private
int main() {
  std::vector<MqlRates> bars={{60,100,104,92,100},{120,100,104,98,100},
    {180,100,104,95,100},{240,100,105,96,100},{300,97,101,93,94}};
  AlgoResult out{};
  CAlgoV1 c; c.Init(1,1,48,240,0,0.01,0,3,0,true);
  c.tradeDir=1; c.entryBar=0; c.entry=100; c.stop=80; c.target=140; c.risk=20;
  c.m1Low=90; c.hasM1Low=true;
  c.M1(bars,3,0,0,false,out); assert(out.m1Low && out.protectedPivot==95 && !out.structureExit);
  c.M1(bars,4,0,0,false,out); assert(out.structureExit && out.structureDirection==1 && c.tradeDir==0);

  CAlgoV1 disabled; disabled.Init(1,1,48,240,0,0.01,0,3,0,false);
  disabled.tradeDir=1; disabled.entryBar=0; disabled.entry=100; disabled.stop=80; disabled.target=140; disabled.risk=20;
  disabled.m1Low=90; disabled.hasM1Low=true;
  disabled.M1(bars,3,0,0,false,out); disabled.M1(bars,4,0,0,false,out);
  assert(!out.structureExit && disabled.tradeDir==1);

  std::vector<MqlRates> shortBars={{60,100,108,96,100},{120,100,102,96,100},
    {180,100,105,96,100},{240,100,104,95,100},{300,100,107,98,106}};
  CAlgoV1 s; s.Init(1,1,48,240,0,0.01,0,3,0,true);
  s.tradeDir=-1; s.entryBar=0; s.entry=100; s.stop=120; s.target=60; s.risk=20;
  s.m1High=110; s.hasM1High=true;
  s.M1(shortBars,3,0,0,false,out); assert(out.m1High && out.protectedPivot==105 && !out.structureExit);
  s.M1(shortBars,4,0,0,false,out); assert(out.structureExit && out.structureDirection==-1 && s.tradeDir==0);

  CAlgoV1 ties; ties.Init(1,1,48,240,0,0.01,0,3,0,true);
  ties.tradeDir=1; ties.entryBar=0; ties.entry=100; ties.stop=80; ties.target=140; ties.risk=20;
  auto tieBars=bars; tieBars[4].low=79; tieBars[4].high=141;
  ties.M1(tieBars,4,0,0,false,out); assert(out.stopHit && !out.targetHit && !out.structureExit);
  CAlgoV1 gap; gap.Init(1,1,48,240,0,0.01,0,3,0,true);
  gap.tradeDir=1; gap.entryBar=0; gap.entry=100; gap.stop=80; gap.target=140; gap.risk=20;
  auto gapBars=bars; gapBars[4].time=360;
  gap.M1(gapBars,4,0,0,false,out); assert(out.gap && gap.tradeDir==0 && !out.structureExit);

  std::vector<MqlRates> engulf={{60,100,105,95,101},{120,101,105,95,100},
    {180,101,103,99,100},{240,99,104,98,102},{300,98,105,97,103}};
  CAlgoV1 immediate; immediate.Init(1,1,48,240,0,0.01,0,3,0,true);
  immediate.phase=2; immediate.direction=1; immediate.waitFrom=2; immediate.m1Low=90; immediate.hasM1Low=true;
  immediate.M1(engulf,3,0,0,false,out); assert(out.buy && immediate.tradeDir==1);
  CAlgoV1 late; late.Init(1,1,48,240,0,0.01,0,3,0,true);
  late.phase=2; late.direction=1; late.waitFrom=2; late.m1Low=90; late.hasM1Low=true;
  auto lateBars=engulf; lateBars[3].open=102; lateBars[3].close=100;
  late.M1(lateBars,3,0,0,false,out); assert(!out.buy && late.phase==0);
  late.M1(lateBars,4,0,0,false,out); assert(!out.buy);
}
'''
        with tempfile.TemporaryDirectory() as tmp:
            cpp = pathlib.Path(tmp) / 'core.cpp'
            exe = pathlib.Path(tmp) / 'core-test'
            cpp.write_text(preamble + source + harness)
            subprocess.run(['g++', '-std=c++17', '-O0', str(cpp), '-o', str(exe)], check=True, capture_output=True, text=True)
            subprocess.run([str(exe)], check=True, capture_output=True, text=True)
