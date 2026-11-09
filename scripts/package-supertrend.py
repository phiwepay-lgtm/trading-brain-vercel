#!/usr/bin/env python3
"""Build the small source-only Strategy Tester package reproducibly."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parents[1]
source = root / 'mt5/Supertrend'
out = root / 'public/ea/Supertrend_HA_Tester_Research.zip'
paths = ['README.txt', 'MQL5/Experts/SupertrendHA_Tester.mq5',
         'MQL5/Experts/STCore.mqh', 'MQL5/Scripts/Create_Supertrend_HA_Template.mq5']
with ZipFile(out, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name in paths:
        info = ZipInfo(name, (2020, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, (source / name).read_bytes())
print(out)
