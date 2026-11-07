#!/usr/bin/env python3
"""Aggregate a locally supplied, explicitly prevalidated 33-trade JSON sample.

Never stores individual trades. Refuses ambiguous or contradictory outcomes and
unexpected sample sizes rather than silently filtering or truncating the sample.
"""
import argparse
import json
import math
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'data' / 'journal_summary.json'
EXPECTED = 33


def classify(trade):
    signals = []
    for key in ('result', 'outcome'):
        value = trade.get(key)
        if value is None or value == '':
            continue
        if not isinstance(value, str):
            raise ValueError(f'{key} must be a recognized outcome string')
        value = value.strip().lower().replace('_', ' ').replace('-', ' ')
        mapping = {'win': 'win', 'w': 'win', 'tp': 'win', 'loss': 'loss', 'l': 'loss', 'sl': 'loss', 'stop': 'loss', 'be': 'breakeven', 'b/e': 'breakeven', 'break even': 'breakeven', 'breakeven': 'breakeven'}
        if value not in mapping:
            raise ValueError(f'{key} contains an unrecognized outcome')
        signals.append(mapping[value])
    pnl = trade.get('pnl')
    if pnl is not None and pnl != '':
        if isinstance(pnl, bool):
            raise ValueError('pnl must be numeric')
        try:
            pnl = float(pnl)
        except (TypeError, ValueError):
            raise ValueError('pnl must be numeric') from None
        if not math.isfinite(pnl):
            raise ValueError('pnl must be finite')
        signals.append('win' if pnl > 0 else 'loss' if pnl < 0 else 'breakeven')
    if not signals or len(set(signals)) != 1:
        raise ValueError('outcome is missing or contradicts another outcome/P&L field')
    return signals[0]


def aggregate(outcomes):
    total = len(outcomes)
    wins = outcomes.count('win')
    losses = outcomes.count('loss')
    decided = wins + losses
    excluding_be = round(wins / decided * 100, 1) if decided else None
    including_be = round(wins / total * 100, 1) if total else None
    return {'trades': total, 'wins': wins, 'losses': losses,
            'breakeven': outcomes.count('breakeven'),
            'win_rate': excluding_be,
            'win_rate_excluding_be': excluding_be,
            'win_rate_including_be': including_be}


def label(value):
    return ' '.join(value.lower().split()) if isinstance(value, str) else ''


def summarize(document):
    if isinstance(document, dict):
        document = document.get('trades', document.get('data'))
    if not isinstance(document, list) or len(document) != EXPECTED:
        raise ValueError('input must be a list of exactly 33 prevalidated trades (or an object with a trades/data list)')
    all_outcomes, bt, vlb = [], [], []
    for index, trade in enumerate(document, 1):
        if not isinstance(trade, dict):
            raise ValueError(f'trade {index}: expected an object')
        if 'isValid' in trade and trade['isValid'] is not True:
            raise ValueError(f'trade {index}: isValid is not true; supply only the prevalidated sample')
        try:
            outcome = classify(trade)
        except ValueError as exc:
            raise ValueError(f'trade {index}: {exc}') from None
        all_outcomes.append(outcome)
        if label(trade.get('entryType')) == 'bt 0.382':
            bt.append(outcome)
        if label(trade.get('exec')) == 'vlb + engulf trigger':
            vlb.append(outcome)
    overall = aggregate(all_outcomes)
    return {
        'status': 'available',
        'total_valid': overall['trades'],
        'wins': overall['wins'],
        'losses': overall['losses'],
        'breakeven': overall['breakeven'],
        'win_rate': overall['win_rate_excluding_be'],
        'win_rate_including_be': overall['win_rate_including_be'],
        'note': 'Locally supplied, user-confirmed prevalidated 33-trade sample; only aggregates retained.',
        'methodology': 'Primary win rate excludes breakevens: wins / (wins + losses). The including-breakeven rate is wins / all trades. A rate with a zero denominator is unavailable. Outcome/result and P&L, when present, must agree. BT 0.382 and VLB + Engulf use exact entryType and exec labels respectively (case and whitespace insensitive).',
        'bt_0382': aggregate(bt), 'vlb_engulf': aggregate(vlb),
        'recovery_export_40': 'found but rejected due to inconsistent outcomes/PnL',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path, help='Path to the local, plaintext, already-filtered 33-trade JSON file')
    parser.add_argument('--prevalidated', action='store_true', required=True, help='Confirm the file contains exactly the 33 valid trades')
    args = parser.parse_args()
    try:
        with args.input.open(encoding='utf-8') as source:
            summary = summarize(json.load(source))
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=OUTPUT.parent, delete=False) as tmp:
            temporary = Path(tmp.name)
            try:
                json.dump(summary, tmp, indent=2, allow_nan=False)
                tmp.write('\n')
            except Exception:
                temporary.unlink(missing_ok=True)
                raise
        try:
            os.replace(temporary, OUTPUT)
        finally:
            temporary.unlink(missing_ok=True)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f'No summary written: {exc}', file=sys.stderr)
        return 1
    print('Wrote aggregate statistics to data/journal_summary.json; no trade records copied.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
