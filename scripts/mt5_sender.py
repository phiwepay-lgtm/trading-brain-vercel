#!/usr/bin/env python3
"""Local bridge that executes trading-alert plans on a running MetaTrader 5 terminal.

The trading-brain webhook (app/api/trade/route.ts) computes a plan from the
alert; this sender executes it: entry, stop and the risk-based lot size are
sent to the terminal with `mt5.order_send`. If the plan omits `lot` but
includes `riskPercent`, the sender reads the live account balance from the
terminal and computes the lot, mirroring lib/trade.ts.

Usage:
    pip install MetaTrader5          # required, must run where the terminal is
    python3 scripts/mt5_sender.py [--host HOST] [--port PORT]

Environment: MT5_LOGIN, MT5_PASSWORD, MT5_SERVER (terminal login),
MT5_BRIDGE_HOST, MT5_BRIDGE_PORT (listen address). The Next.js route picks the
bridge up through MT5_BRIDGE_URL, e.g. http://127.0.0.1:8123.

Plan fields: symbol, direction ("long"/"short"), entry, stop, plus optional
take_profit, lot, riskPercent, pipValuePerLot, digits, minLot, maxLot,
lotStep, balance, magic, comment, deviation.

Returns JSON for each POST: ok, retcode, retcode_description, ticket, volume,
price, sl, tp, symbol, direction, lot. Errors are returned as 400 with an
"error" message.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_HOST = '127.0.0.1'
DEFAULT_PORT = 8123


def floor_to_step(value, step=None):
    """Rounds a lot down to the broker's step (e.g. 0.01)."""
    if not (step and step > 0):
        return value
    units = value / step
    # Tiny tolerance so a mathematically integral ratio is not floored one step down.
    corrected = units + sys.float_info.epsilon * max(1.0, abs(units))
    return math.floor(corrected) * step


def pip_size_from_digits(digits):
    """Typical pip size for a symbol: 5 digits (EURUSD) = 0.0001, 3 (USDJPY) = 0.01."""
    return 10 ** -(digits - 1)


def compute_lot_size(balance, risk_percent, pips_at_risk, pip_value_per_lot, min_lot=0.0, max_lot=math.inf, lot_step=None):
    """Risk-based lot size: riskUSD / (pipsAtRisk * pipValuePerLot), floored to the lot step."""
    if not (isinstance(balance, (int, float)) and math.isfinite(balance) and balance > 0):
        raise ValueError('balance must be a positive number')
    if not (isinstance(risk_percent, (int, float)) and 0 < risk_percent <= 100):
        raise ValueError('risk_percent must be greater than 0 and at most 100')
    if not (isinstance(pips_at_risk, (int, float)) and math.isfinite(pips_at_risk) and pips_at_risk > 0):
        raise ValueError('pips_at_risk must be greater than 0')
    if not (isinstance(pip_value_per_lot, (int, float)) and math.isfinite(pip_value_per_lot) and pip_value_per_lot > 0):
        raise ValueError('pip_value_per_lot must be greater than 0')
    risk_usd = balance * (risk_percent / 100)
    lot = floor_to_step(risk_usd / (pips_at_risk * pip_value_per_lot), lot_step)
    lot = min(max_lot, max(min_lot, lot))
    if not math.isfinite(lot) or lot <= 0:
        raise ValueError('risk settings produced a lot size of 0 or less; lower risk_percent or widen the stop')
    return lot


def plan_pips_at_risk(entry, stop, direction, pip_size):
    """Stop distance in pips: entry - stop for long, stop - entry for short."""
    if direction not in ('long', 'short'):
        raise ValueError('direction must be "long" or "short"')
    if not (isinstance(entry, (int, float)) and entry > 0):
        raise ValueError('entry must be a positive number')
    if not (isinstance(stop, (int, float)) and stop > 0):
        raise ValueError('stop must be a positive number')
    if not (isinstance(pip_size, (int, float)) and pip_size > 0):
        raise ValueError('pip_size must be a positive number')
    distance = entry - stop if direction == 'long' else stop - entry
    if not distance > 0:
        raise ValueError(f'stop must be {"below" if direction == "long" else "above"} the entry price')
    return distance / pip_size


def plan_lot(plan, balance):
    """Lot from the plan: an explicit `lot` wins; otherwise risk% of the balance."""
    lot = plan.get('lot')
    if lot is not None and float(lot) > 0:
        return float(lot)
    risk_percent = plan.get('riskPercent', plan.get('risk_percent'))
    pip_value_per_lot = plan.get('pipValuePerLot', plan.get('pip_value_per_lot'))
    if not (risk_percent and pip_value_per_lot and plan.get('entry') and plan.get('stop')):
        raise ValueError('plan must include lot or riskPercent with entry, stop and pipValuePerLot')
    pips = plan_pips_at_risk(float(plan['entry']), float(plan['stop']), plan.get('direction'),
                             pip_size_from_digits(plan.get('digits', 5)))
    return compute_lot_size(balance, float(risk_percent), pips, float(pip_value_per_lot),
                            min_lot=plan.get('minLot') or 0.0,
                            max_lot=plan.get('maxLot') or math.inf,
                            lot_step=plan.get('lotStep'))


def resolve_balance(plan):
    """Balance for risk sizing: the plan's `balance`, else the live account balance."""
    balance = plan.get('balance')
    if balance is not None and float(balance) > 0:
        return float(balance)
    import MetaTrader5 as mt5
    info = mt5.account_info()
    if info is None:
        raise RuntimeError('could not read the live account balance from the terminal')
    return float(info.balance)


def execute_plan(plan):
    """Executes a plan on the terminal and returns a JSON-serialisable result."""
    try:
        import MetaTrader5 as mt5
    except ImportError as exc:
        raise RuntimeError('MetaTrader 5 is not installed; run: pip install MetaTrader5') from exc

    if not mt5.initialize(
        server=os.environ.get('MT5_SERVER') or None,
        login=int(os.environ['MT5_LOGIN']) if os.environ.get('MT5_LOGIN') else None,
        password=os.environ.get('MT5_PASSWORD') or None,
    ):
        raise RuntimeError(f'mt5.initialize failed: {mt5.last_error()}')

    try:
        symbol = plan['symbol']
        direction = plan['direction']
        if direction not in ('long', 'short'):
            raise ValueError('direction must be "long" or "short"')

        balance = resolve_balance(plan)
        lot = plan_lot(plan, balance)

        info = mt5.symbol_info(symbol)
        tick = mt5.symbol_info_tick(symbol)
        if info is None:
            raise RuntimeError(f'Symbol {symbol} not found in the terminal')
        if tick is None:
            raise RuntimeError(f'No tick data for {symbol}; try again when the market is open')

        # Broker volume must match the step; do not silently increase exposure (same policy as the MQL EA).
        if (lot < info.volume_min or lot > info.volume_max
                or abs(lot / info.volume_step - round(lot / info.volume_step)) > 1e-7):
            raise ValueError(f'lot {lot} is outside volume min {info.volume_min}, max {info.volume_max}, step {info.volume_step}')

        entry = plan.get('entry') or (tick.ask if direction == 'long' else tick.bid)
        request = {
            'action': mt5.TRADE_ACTION_DEAL,
            'symbol': symbol,
            'volume': lot,
            'type': mt5.ORDER_TYPE_BUY if direction == 'long' else mt5.ORDER_TYPE_SELL,
            'price': float(entry),
            'sl': float(plan['stop']) if plan.get('stop') else 0.0,
            'tp': float(plan['take_profit']) if plan.get('take_profit') else 0.0,
            'deviation': int(plan.get('deviation', 3)),
            'magic': int(plan.get('magic', 0)),
            'comment': plan.get('comment') or 'plan webhook trade',
        }
        result = mt5.order_send(request)
        if result is None:
            raise RuntimeError(f'order_send returned None: {mt5.last_error()}')

        retcode = result.retcode
        return {
            'ok': retcode in (mt5.TRADE_RETCODE_DONE, mt5.TRADE_RETCODE_DONE_PARTIAL),
            'retcode': int(retcode),
            'retcode_description': mt5.retcode_description(retcode) if hasattr(mt5, 'retcode_description') else None,
            'ticket': int(result.order or result.deal or 0),
            'volume': float(result.volume or 0.0),
            'price': float(result.price or 0.0),
            'symbol': symbol,
            'direction': direction,
            'lot': lot,
            'sl': float(result.sl or 0.0),
            'tp': float(result.tp or 0.0),
        }
    finally:
        mt5.shutdown()


class BridgeHandler(BaseHTTPRequestHandler):
    """Accepts a POST plan and executes it; answers JSON with the result."""

    def do_POST(self):
        length = int(self.headers.get('Content-Length') or 0)
        raw = self.rfile.read(length) if length else b''
        try:
            plan = json.loads(raw or b'{}')
        except json.JSONDecodeError as exc:
            return self._send(400, {'error': f'invalid JSON: {exc}'})
        if not isinstance(plan, dict) or not plan.get('symbol'):
            return self._send(400, {'error': 'plan must be a JSON object with symbol, direction, entry, stop and lot (or riskPercent)'})
        try:
            result = execute_plan(plan)
        except (ValueError, RuntimeError) as exc:
            return self._send(400, {'error': str(exc)})
        return self._send(200, result)

    def _send(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print(f'{self.address_string()} - {fmt % args}', flush=True)


def main():
    parser = argparse.ArgumentParser(description='Execute trading-alert plans on a running MetaTrader 5 terminal.')
    parser.add_argument('--host', default=os.environ.get('MT5_BRIDGE_HOST') or DEFAULT_HOST)
    parser.add_argument('--port', type=int, default=int(os.environ.get('MT5_BRIDGE_PORT') or DEFAULT_PORT))
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), BridgeHandler)
    print(f'mt5 sender listening on http://{args.host}:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('mt5 sender stopped', flush=True)


if __name__ == '__main__':
    main()
