#!/usr/bin/env python3
"""Build the public v15 source ZIP reproducibly; never include journal records."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent.parent
FILES = {
    'Pine/TradingBrain_M5_M1_v15.pine': 'public/ea/TradingBrain_M5_M1_v15.pine',
    'Pine/TradingBrain_Indicator_v15.pine': 'public/ea/TradingBrain_Indicator_v15.pine',
    'MQ5/TradingBrain_v15.mq5': 'public/ea/TradingBrain_v15.mq5',
    'MQ5/TradingBrain_Tester_v15.mq5': 'public/ea/TradingBrain_Tester_v15.mq5',
    'Docs/CHANGELOG-v15-BT-FTB.md': 'docs/CHANGELOG-v15-BT-FTB.md',
    'Docs/AUDIT-40records.txt': 'docs/AUDIT-40records.txt',
}


def build():
    destination = ROOT / 'public/ea/TradingBrain-v15-BT-FTB-Full.zip'
    with ZipFile(destination, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, relative in FILES.items():
            info = ZipInfo(name, date_time=(2024, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, (ROOT / relative).read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    print(destination)


if __name__ == '__main__':
    build()
