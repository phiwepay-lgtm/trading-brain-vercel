"""Exercise the Indie session algorithm with Python fakes; not an Indie compiler."""
import importlib.machinery
import importlib.util
import inspect
import math
import sys
import types
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
sys.dont_write_bytecode = True
indie = types.ModuleType('indie')
indie.indicator = lambda *a, **kw: lambda cls: cls
indie.param = types.SimpleNamespace(**{name: (lambda *a, **kw: lambda cls: cls) for name in ('bool', 'int', 'str')})
indie.MainContext = object
class Colour:
    def __call__(self, alpha): return ('aqua', alpha)
indie.color = types.SimpleNamespace(TEAL='teal', AQUA=Colour(), TRANSPARENT='transparent')
indie.plot = types.SimpleNamespace(steps=lambda *a, **kw: lambda cls: cls, fill=lambda *a, **kw: lambda cls: cls,
                                   Fill=lambda **kw: kw)
class Series:
    def __init__(self, init): self.prev = init; self.now = init
    def __getitem__(self, i): return self.now if i == 0 else self.prev
    def __setitem__(self, i, v): assert i == 0; self.now = v
class Factory:
    items = {}
    @classmethod
    def new(cls, init):
        line = inspect.currentframe().f_back.f_lineno
        if line not in cls.items: cls.items[line] = Series(init)
        return cls.items[line]
indie.MutSeriesF = Factory
sys.modules['indie'] = indie
schedule = types.ModuleType('indie.schedule')
schedule.ALL_DAYS = []
schedule.ScheduleRule = lambda **kw: kw
class Schedule:
    def __init__(self, rules, timezone): self.rule, self.zone = rules[0], ZoneInfo(timezone)
    def key(self, t):
        d = datetime.fromtimestamp(t, timezone.utc).astimezone(self.zone)
        start, end, wall = self.rule['start'], self.rule['end'], d.time().replace(tzinfo=None)
        if start < end: return d.date() if start <= wall < end else None
        return (d.date() if wall >= start else d.date() - timedelta(days=1)) if wall >= start or wall < end else None
    def __contains__(self, t): return self.key(t) is not None
    def is_same_period(self, a, b): return self.key(a) is not None and self.key(a) == self.key(b)
schedule.Schedule = Schedule
sys.modules['indie.schedule'] = schedule
loader = importlib.machinery.SourceFileLoader('session', 'public/ea/Blackwatch_My_Session_Range.indie.txt')
module = importlib.util.module_from_spec(importlib.util.spec_from_loader(loader.name, loader))
loader.exec_module(module)

def stamp(dt): return datetime.fromisoformat(dt).replace(tzinfo=timezone.utc).timestamp()
def new():
    Factory.items = {}
    m = module.Main(3, 0, 7, 0, 'Etc/GMT+5')
    m.history = []
    return m
def run(m, time, hi, lo, show=True, fill=True):
    ts = stamp(time)
    m.time = [ts] + m.history[-1:]
    m.high = [hi]; m.low = [lo]
    result = m.calc(show, fill)
    for s in Factory.items.values(): s.prev = s.now
    m.history.append(ts)
    return result
m = new()
assert math.isnan(run(m, '2026-01-01T07:59', 110, 90)[0])
a = run(m, '2026-01-01T08:00', 100, 95); assert a[:2] == (100, 95)
a = run(m, '2026-01-01T08:01', 101, 96); assert a[:2] == (101, 95)
a = run(m, '2026-01-01T08:02', 100, 94, fill=False); assert a[:2] == (101, 94) and a[2]['color'] == 'transparent'
assert math.isnan(run(m, '2026-01-01T12:00', 105, 89)[0])
a = run(m, '2026-01-02T08:00', 104, 98); assert a[:2] == (104, 98)
m = new(); run(m, '2026-01-01T08:00', 100, 95)
a = run(m, '2026-01-02T08:00', 120, 110); assert math.isnan(a[0]) and math.isnan(a[1])
a = run(m, '2026-01-02T08:01', 119, 111); assert a[:2] == (120, 110)
a = run(m, '2026-01-02T08:02', 121, 109, show=False); assert math.isnan(a[0])
a = run(m, '2026-01-02T08:03', 118, 112); assert a[:2] == (121, 109)
print('Python mock checks passed (not an Indie runtime test)')
