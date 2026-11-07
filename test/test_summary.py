import unittest
from scripts.summarize_journal import summarize


def trade(**kwargs):
    return {'outcome': 'win', 'pnl': 1, 'entryType': 'BT 0.382', 'exec': 'VLB + Engulf Trigger', **kwargs}


class SummaryTests(unittest.TestCase):
    def test_groups_and_breakeven(self):
        trades = [trade() for _ in range(31)] + [trade(outcome='be', pnl=0), trade(outcome='loss', pnl=-1, entryType='FTB 0.382', exec='VHB + Engulf Trigger')]
        summary = summarize({'trades': trades})
        self.assertEqual((summary['total_valid'], summary['wins'], summary['losses'], summary['breakeven']), (33, 31, 1, 1))
        self.assertEqual(summary['win_rate'], 96.9)
        self.assertEqual(summary['win_rate_including_be'], 93.9)
        self.assertEqual(summary['bt_0382']['trades'], 32)
        self.assertEqual(summary['vlb_engulf']['trades'], 32)

    def test_rejects_unexpected_count_or_invalid(self):
        with self.assertRaises(ValueError):
            summarize([trade()] * 40)
        with self.assertRaises(ValueError):
            summarize([trade()] * 32 + [trade(isValid=False)])

    def test_rejects_conflicting_or_missing_outcomes(self):
        for bad in [trade(outcome='win', pnl=-1), trade(outcome='loss', pnl=0), trade(outcome=None, pnl=None)]:
            with self.assertRaises(ValueError):
                summarize([trade()] * 32 + [bad])

    def test_outcome_synonyms_and_pnl_fallback(self):
        from scripts.summarize_journal import classify
        for outcome, expected in [('w', 'win'), ('tp', 'win'), ('l', 'loss'), ('sl', 'loss'), ('stop', 'loss'), ('b/e', 'breakeven')]:
            self.assertEqual(classify({'result': outcome}), expected)
        self.assertEqual(classify({'pnl': 0}), 'breakeven')
        self.assertEqual(classify({'pnl': -2}), 'loss')

    def test_all_breakevens_have_no_decided_win_rate(self):
        summary = summarize([trade(outcome='be', pnl=0)] * 33)
        self.assertIsNone(summary['win_rate'])
        self.assertEqual(summary['win_rate_including_be'], 0.0)
        self.assertIsNone(summary['win_rate'])

    def test_zero_match_has_null_rate(self):
        summary = summarize([trade(entryType='other', exec='other')] * 33)
        self.assertEqual(summary['bt_0382']['trades'], 0)
        self.assertIsNone(summary['bt_0382']['win_rate'])
        self.assertIsNone(summary['bt_0382']['win_rate_including_be'])

if __name__ == '__main__':
    unittest.main()
