import { NextRequest, NextResponse } from 'next/server';
import { computeTradePlan } from '../../../lib/trade';

interface TradeWebhookBody {
  symbol?: unknown;
  direction?: unknown;
  entry?: unknown;
  stop?: unknown;
  balance?: unknown;
  riskPercent?: unknown;
  pipValuePerLot?: unknown;
  digits?: unknown;
  minLot?: unknown;
  maxLot?: unknown;
  lotStep?: unknown;
}

function stringOrUndefined(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0) throw new RangeError(`${name} must be a non-empty string`);
  return value;
}

function numberOrUndefined(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${name} must be a number`);
  return value;
}

function directionOrUndefined(value: unknown): 'long' | 'short' | undefined {
  if (value === undefined) return undefined;
  if (value === 'long' || value === 'short') return value;
  throw new RangeError('direction must be "long" or "short"');
}

/** TradingView alerts arrive as POSTs with a JSON body; the plan comes back as JSON. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.TRADE_WEBHOOK_SECRET;
  if (webhookSecret && request.headers.get('x-trade-secret') !== webhookSecret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as TradeWebhookBody | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'request body must be a JSON object' }, { status: 400 });
  }

  try {
    const plan = computeTradePlan({
      symbol: stringOrUndefined(body.symbol, 'symbol') ?? '',
      direction: directionOrUndefined(body.direction) as 'long' | 'short',
      entry: numberOrUndefined(body.entry, 'entry') as number,
      stop: numberOrUndefined(body.stop, 'stop') as number,
      balance: numberOrUndefined(body.balance, 'balance') as number,
      riskPercent: numberOrUndefined(body.riskPercent, 'riskPercent') as number,
      pipValuePerLot: numberOrUndefined(body.pipValuePerLot, 'pipValuePerLot') as number,
      digits: numberOrUndefined(body.digits, 'digits'),
      minLot: numberOrUndefined(body.minLot, 'minLot'),
      maxLot: numberOrUndefined(body.maxLot, 'maxLot'),
      lotStep: numberOrUndefined(body.lotStep, 'lotStep'),
    });

    // When a local MT5 bridge runs (see scripts/mt5_sender.py), forward the plan to it.
    const bridgeUrl = process.env.MT5_BRIDGE_URL;
    if (bridgeUrl) {
      const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      }).catch(() => null);
      if (!response) return NextResponse.json({ error: 'bridge is unreachable' }, { status: 502 });
      const bridgeBody = await response.json().catch(() => null);
      if (!response.ok) {
        return NextResponse.json({ error: 'bridge rejected the plan', mt5: { status: response.status, body: bridgeBody } }, { status: 502 });
      }
      return NextResponse.json({ status: 'ok', ...plan, mt5: bridgeBody });
    }

    return NextResponse.json({ status: 'ok', ...plan });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'invalid trade request' }, { status: 400 });
  }
}
