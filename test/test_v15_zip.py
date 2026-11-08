import hashlib
import unittest
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    'Pine/TradingBrain_M5_M1_v15.pine': 'public/ea/TradingBrain_M5_M1_v15.pine',
    'Pine/TradingBrain_Indicator_v15.pine': 'public/ea/TradingBrain_Indicator_v15.pine',
    'MQ5/TradingBrain_v15.mq5': 'public/ea/TradingBrain_v15.mq5',
    'MQ5/TradingBrain_Tester_v15.mq5': 'public/ea/TradingBrain_Tester_v15.mq5',
    'Docs/CHANGELOG-v15-BT-FTB.md': 'docs/CHANGELOG-v15-BT-FTB.md',
    'Docs/AUDIT-40records.txt': 'docs/AUDIT-40records.txt',
}


class V15ZipTest(unittest.TestCase):
    def test_zip_contents_match_sources(self):
        with ZipFile(ROOT / 'public/ea/TradingBrain-v15-BT-FTB-Full.zip') as z:
            self.assertEqual(set(z.namelist()), set(FILES))
            self.assertIsNone(z.testzip())
            for name, source in FILES.items():
                self.assertEqual(z.read(name), (ROOT / source).read_bytes(), name)

    def test_v15_strategy_unchanged(self):
        strategy = (ROOT / 'public/ea/TradingBrain_M5_M1_v15.pine').read_bytes()
        self.assertEqual(hashlib.sha256(strategy).hexdigest(), 'b005f40541322758e7bb6dd1c797c217440f3ab12cec66786715ec46e8104c50')


if __name__ == '__main__':
    unittest.main()
