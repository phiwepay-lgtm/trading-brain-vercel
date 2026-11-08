#!/usr/bin/env python3
"""Build the MT5 tester-only source/preset package without private data."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent.parent
FILES = {
    'Experts/TradingBrain_Tester_v153.mq5': 'reference/legacy-ea/TradingBrain_Tester_v153.mq5',
    'Presets/TradingBrain_v153_Both.set': 'reference/legacy-ea/TradingBrain_v153_Both.set',
    'Presets/TradingBrain_v153_FTB_Only.set': 'reference/legacy-ea/TradingBrain_v153_FTB_Only.set',
    'Presets/TradingBrain_v153_BT_Only.set': 'reference/legacy-ea/TradingBrain_v153_BT_Only.set',
    'Presets/TradingBrain_v153_BT_RR2.set': 'reference/legacy-ea/TradingBrain_v153_BT_RR2.set',
    'Presets/TradingBrain_v153_BT_RR5.set': 'reference/legacy-ea/TradingBrain_v153_BT_RR5.set',
    'Presets/TradingBrain_v153_BT_RR7.set': 'reference/legacy-ea/TradingBrain_v153_BT_RR7.set',
    'Docs/MT5-Strategy-Tester-Guide.md': 'docs/mt5-v153-tester-guide.md',
}


def build():
    destination = ROOT / 'reference/legacy-ea/TradingBrain-MT5-v153-Tester.zip'
    with ZipFile(destination, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, relative in FILES.items():
            info = ZipInfo(name, date_time=(2024, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, (ROOT / relative).read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    print(destination)


if __name__ == '__main__':
    build()
