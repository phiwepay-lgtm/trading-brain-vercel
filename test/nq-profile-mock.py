"""Exercise the Indie algorithm as Python with fake chart APIs; not an Indie compiler."""
import importlib.machinery
import importlib.util
import sys
sys.dont_write_bytecode = True
import types
from datetime import datetime, timedelta, time, timezone
from zoneinfo import ZoneInfo

indie = types.ModuleType('indie')
indie.indicator = lambda *a, **kw: lambda cls: cls
indie.param = types.SimpleNamespace(**{name: (lambda *a, **kw: lambda cls: cls) for name in ('int', 'float', 'str')})
indie.MainContext = object
class Colour:
    def __call__(self, alpha): return self
indie.color = types.SimpleNamespace(**{name: Colour() for name in ('TEAL', 'RED', 'BLUE', 'GRAY', 'TRANSPARENT', 'YELLOW', 'AQUA')})
sys.modules['indie'] = indie
schedule = types.ModuleType('indie.schedule')
schedule.ALL_DAYS = []
schedule.ScheduleRule = lambda **kwargs: kwargs
class Schedule:
    def __init__(self, **kwargs): pass
    def is_same_period(self, a, b):
        def key(t):
            dt = datetime.fromtimestamp(t, timezone.utc).astimezone(ZoneInfo('America/New_York'))
            return dt.date() if dt.time() >= time(16) else dt.date() - timedelta(days=1)
        return key(a) == key(b)
schedule.Schedule = Schedule
sys.modules['indie.schedule'] = schedule
drawings = types.ModuleType('indie.drawings')
class Item:
    def __init__(self, *args, **kwargs): self.args, self.kwargs = args, kwargs
class Position(Item): pass
class Rectangle(Item): pass
class LineSegment(Item): pass
class LabelRel(Item): pass
for obj in (Position, Rectangle, LineSegment, LabelRel): setattr(drawings, 'AbsolutePosition' if obj is Position else obj.__name__, obj)
drawings.relative_position = types.SimpleNamespace(TOP_RIGHT='top-right')
sys.modules['indie.drawings'] = drawings
loader = importlib.machinery.SourceFileLoader('nq', 'public/ea/NQ_Developing_Volume_Profile.indie.txt')
spec = importlib.util.spec_from_loader(loader.name, loader)
module = importlib.util.module_from_spec(spec)
loader.exec_module(module)
class Chart:
    def __init__(self): self.items = []
    def clean(self): self.items = []
    def draw(self, x): self.items.append(x)

def check(rows):
    m = module.Main(); m.bar_index = len(rows) - 1; m.is_last_bar = True; m.chart = Chart()
    for n in ('time', 'open', 'high', 'low', 'close', 'volume'):
        setattr(m, n, [row[n] for row in rows][::-1])
    m.calc(10, 10, 70.0, 'Up/Down', 30.0)
    return m.chart.items

def bar(day, hour, minute, o, h, l, c, v):
    t = datetime.fromisoformat(day).replace(hour=hour, minute=minute, tzinfo=ZoneInfo('America/New_York'))
    return dict(time=t.timestamp(), open=o, high=h, low=l, close=c, volume=v)

for date in ('2026-01-06', '2026-07-06', '2026-03-08', '2026-11-01', '2026-12-31'):
    candles = [bar(date, 15, 59, 10, 1000, 1, 50, 1000),
               bar(date, 16, 0, 101, 110, 100, 109, 100),
               bar(date, 16, 1, 109, 110, 108, 108, 20)]
    items = check(candles)
    lines = [x for x in items if isinstance(x, LineSegment)]
    rectangles = [x for x in items if isinstance(x, Rectangle)]
    labels = [x.args[0] for x in items if isinstance(x, LabelRel)]
    assert len(lines) == 3 and len(rectangles) == 12 and '2 bars' in labels[0], (date, labels)
    assert lines[0].args[0].args[1] == 108.5  # lowest POC in a tie
    assert lines[0].args[0].args[0] == candles[1]['time']
empty = check([bar('2026-01-06', 16, 0, 1, 2, 0, 1, 0), bar('2026-01-06', 16, 1, 1, 2, 0, 1, 0)])
assert len(empty) == 1 and 'No positive volume' in empty[0].args[0]
truncated = check([bar('2026-01-06', 16, i, 1, 2, 0, 1, 1) for i in range(11)])
assert 'SCAN LIMIT' in [x.args[0] for x in truncated if isinstance(x, LabelRel)][0]
print('Python mock checks passed (not an Indie runtime test)')
