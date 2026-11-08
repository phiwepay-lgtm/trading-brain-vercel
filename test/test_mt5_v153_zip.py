import unittest
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
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


class MT5V153ZipTest(unittest.TestCase):
    def test_zip_exact_content(self):
        with ZipFile(ROOT / 'reference/legacy-ea/TradingBrain-MT5-v153-Tester.zip') as archive:
            self.assertEqual(set(archive.namelist()), set(FILES))
            self.assertIsNone(archive.testzip())
            for name, source in FILES.items():
                self.assertEqual(archive.read(name), (ROOT / source).read_bytes(), name)


if __name__ == '__main__':
    unittest.main()
