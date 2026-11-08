import unittest
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    'Pine/TradingBrain_M5_M1_v15.pine': 'reference/legacy-ea/TradingBrain_M5_M1_v15.pine',
    'Pine/TradingBrain_Indicator_v15.pine': 'reference/legacy-ea/TradingBrain_Indicator_v15.pine',
    'MQ5/TradingBrain_v15.mq5': 'reference/legacy-ea/TradingBrain_v15.mq5',
    'MQ5/TradingBrain_Tester_v15.mq5': 'reference/legacy-ea/TradingBrain_Tester_v15.mq5',
    'Docs/CHANGELOG-v15-BT-FTB.md': 'docs/CHANGELOG-v15-BT-FTB.md',
    'Docs/AUDIT-40records.txt': 'docs/AUDIT-40records.txt',
}


class V15ZipTest(unittest.TestCase):
    def test_zip_contents_match_sources(self):
        with ZipFile(ROOT / 'reference/legacy-ea/TradingBrain-v15-BT-FTB-Full.zip') as z:
            self.assertEqual(set(z.namelist()), set(FILES))
            self.assertIsNone(z.testzip())
            for name, source in FILES.items():
                self.assertEqual(z.read(name), (ROOT / source).read_bytes(), name)

    def test_bt_ftb_path_still_separate(self):
        strategy = (ROOT / 'reference/legacy-ea/TradingBrain_M5_M1_v15.pine').read_text()
        self.assertIn('pathReady = setupType == "FTB" or (setupType == "BT" and nearFib)', strategy)
        self.assertIn('if state == "WAITING_0382" and bar_index > bosBar and low <= fib0382 and high >= fib0382', strategy)
        self.assertIn('if state == "FTB_FOUND" and bar_index > bosBar', strategy)
        self.assertIn('Enable_Simulation = input.bool(false', strategy)


if __name__ == '__main__':
    unittest.main()
