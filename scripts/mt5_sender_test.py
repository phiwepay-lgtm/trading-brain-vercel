#!/usr/bin/env python3
"""Checks for the pure planning helpers in scripts/mt5_sender.py (no terminal needed).

Run with: python3 scripts/mt5_sender_test.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mt5_sender as sender


def main():
    count = 0

    def close(actual, expected, epsilon=1e-9):
        nonlocal count
        assert abs(actual - expected) <= epsilon, f'{actual} != {expected}'
        count += 1

    def raises(fn, label):
        nonlocal count
        try:
            fn()
        except ValueError:
            count += 1
            return
        raise AssertionError(f'{label} did not raise ValueError')

    # compute_lot_size: risk scales with the account balance.
    sizing = {'risk_percent': 1, 'pips_at_risk': 10, 'pip_value_per_lot': 10}
    close(sender.compute_lot_size(10000, **sizing), 1.0)
    close(sender.compute_lot_size(20000, **sizing), 2.0)
    close(sender.compute_lot_size(5000, **sizing), 0.5)

    # compute_lot_size: risk scales with the distance at risk.
    close(sender.compute_lot_size(10000, 1, 100, 10), 0.1)
    close(sender.compute_lot_size(10000, 1, 50, 10), 0.2)
    close(sender.compute_lot_size(10000, 1, 25, 10), 0.4)

    # compute_lot_size: clamps to max_lot and lot_step.
    close(sender.compute_lot_size(10000, 1, 1, 10, max_lot=0.5), 0.5)
    close(sender.compute_lot_size(10000, 1, 1000, 10, min_lot=0.3), 0.3)
    close(sender.compute_lot_size(9970, 1, 10, 10, lot_step=0.01), 0.99)

    # compute_lot_size: rejects zero or invalid settings.
    raises(lambda: sender.compute_lot_size(0, 1, 10, 10), 'balance 0')
    raises(lambda: sender.compute_lot_size(10000, 101, 10, 10), 'risk 101')
    raises(lambda: sender.compute_lot_size(10000, 0, 10, 10), 'risk 0')
    raises(lambda: sender.compute_lot_size(10000, 1, 0, 10), 'pips 0')
    raises(lambda: sender.compute_lot_size(10000, 1, 10, 0), 'pip_value 0')

    # plan_pips_at_risk: entry and stop convert to pips in either direction.
    close(sender.plan_pips_at_risk(100, 99.5, 'long', 0.0001), 5000)
    close(sender.plan_pips_at_risk(100.50, 100.75, 'short', 0.0001), 2500)
    raises(lambda: sender.plan_pips_at_risk(100, 100, 'long', 0.0001), 'long stop above entry')
    raises(lambda: sender.plan_pips_at_risk(100, 99.5, 'short', 0.0001), 'short stop below entry')

    # pip_size_from_digits: typical symbol decimal places.
    close(sender.pip_size_from_digits(5), 0.0001, 1e-12)
    close(sender.pip_size_from_digits(3), 0.01, 1e-12)
    close(sender.pip_size_from_digits(2), 0.1, 1e-12)

    # plan_lot: explicit lot wins; otherwise risk% of the balance.
    plan = {'symbol': 'EURUSD', 'direction': 'long', 'entry': 1.09456, 'stop': 1.09356, 'lot': 2.5}
    close(sender.plan_lot(plan, 99999), 2.5)
    close(sender.plan_lot({'symbol': 'EURUSD', 'direction': 'long', 'entry': 1.09456, 'stop': 1.09356,
                           'balance': 50000, 'riskPercent': 1, 'pipValuePerLot': 10}, 50000), 5.0)
    raises(lambda: sender.plan_lot({'symbol': 'EURUSD', 'entry': 1.09456, 'stop': 1.09356}, 100),
           'plan without lot or riskPercent')

    print(f'mt5 sender: {count} checks passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
