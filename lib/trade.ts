// Pure, testable helpers that turn a chart alert into a concrete trade plan:
// entry, stop and a risk-based lot size. Shared by the TradingView webhook
// endpoint (app/api/trade/route.ts).

export type Direction = 'long' | 'short';

export interface LotSizingOptions {
  /** Account balance in the account currency. */
  balance: number;
  /** Fraction of the account risked per trade (1 means 1%). */
  riskPercent: number;
  /** Distance from entry to stop, in symbol pips. */
  pipsAtRisk: number;
  /** Dollar value of one pip of one standard lot. */
  pipValuePerLot: number;
  /** Smallest accepted lot. */
  minLot?: number;
  /** Largest accepted lot. */
  maxLot?: number;
  /** Lot step the broker accepts (e.g. 0.01). */
  lotStep?: number;
}

export interface TradePlanInput {
  symbol: string;
  direction: Direction;
  /** Entry price for the trade. */
  entry: number;
  /** Stop price: below the entry for long, above it for short. */
  stop: number;
  /** Account balance in the account currency. */
  balance: number;
  /** Fraction of the account risked per trade (1 means 1%). */
  riskPercent: number;
  /** Dollar value of one pip of one standard lot. */
  pipValuePerLot: number;
  /** Decimal places of the symbol (EURUSD = 5). Defaults to 5. */
  digits?: number;
  /** Explicit pip size; overrides `digits`. */
  pipSize?: number;
  minLot?: number;
  maxLot?: number;
  lotStep?: number;
}

export interface TradePlan {
  symbol: string;
  direction: Direction;
  entry: number;
  stop: number;
  lot: number;
  pipsAtRisk: number;
  riskUSD: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function riskAmount(balance: number, riskPercent: number): number {
  return balance * (riskPercent / 100);
}

/** Rounds a lot down to the broker's step (e.g. 0.01). */
function floorToStep(value: number, step?: number): number {
  if (!(step && step > 0)) return value;
  const units = value / step;
  const corrected = units + Number.EPSILON * Math.max(1, Math.abs(units));
  return Math.floor(corrected) * step;
}

/** Typical pip size for a symbol: 5 digits (EURUSD) = 0.0001, 3 (USDJPY) = 0.01. */
export function pipSizeForDigits(digits: number): number {
  return 10 ** -(digits - 1);
}

/** Risk-based lot size: riskUSD / (pipsAtRisk × pipValuePerLot), floored to the lot step. */
export function calculateLotSize(options: LotSizingOptions): number {
  const { balance, riskPercent, pipsAtRisk, pipValuePerLot } = options;
  if (!isFiniteNumber(balance) || balance <= 0) throw new RangeError('balance must be a positive number');
  if (!isFiniteNumber(riskPercent) || riskPercent <= 0 || riskPercent > 100) throw new RangeError('riskPercent must be greater than 0 and at most 100');
  if (!isFiniteNumber(pipsAtRisk) || pipsAtRisk <= 0) throw new RangeError('pipsAtRisk must be greater than 0');
  if (!isFiniteNumber(pipValuePerLot) || pipValuePerLot <= 0) throw new RangeError('pipValuePerLot must be greater than 0');

  const minLot = options.minLot ?? 0;
  const maxLot = options.maxLot ?? Number.POSITIVE_INFINITY;
  const lot = Math.min(maxLot, Math.max(minLot, floorToStep(riskAmount(balance, riskPercent) / (pipsAtRisk * pipValuePerLot), options.lotStep)));
  if (!Number.isFinite(lot) || lot <= 0) throw new RangeError('risk settings produced a lot size of 0 or less; lower riskPercent or widen the stop');
  return lot;
}

/** Stop distance in pips: entry − stop for long, stop − entry for short. */
export function stopPipsFor(entry: number, stop: number, direction: Direction, pipSize: number): number {
  if (!isFiniteNumber(entry) || entry <= 0) throw new RangeError('entry must be a positive number');
  if (!isFiniteNumber(stop) || stop <= 0) throw new RangeError('stop must be a positive number');
  if (!isFiniteNumber(pipSize) || pipSize <= 0) throw new RangeError('pipSize must be a positive number');
  if (direction !== 'long' && direction !== 'short') throw new RangeError('direction must be "long" or "short"');
  const distance = direction === 'long' ? entry - stop : stop - entry;
  if (!(distance > 0)) throw new RangeError(`stop must be ${direction === 'long' ? 'below' : 'above'} the entry price`);
  return distance / pipSize;
}

/** Validates and converts a chart alert into a concrete trade plan with a risk-based lot. */
export function computeTradePlan(input: TradePlanInput): TradePlan {
  const symbol = input.symbol;
  if (typeof symbol !== 'string' || symbol.length === 0) throw new RangeError('symbol must be a non-empty string');
  if (input.direction !== 'long' && input.direction !== 'short') throw new RangeError('direction must be "long" or "short"');
  const entry = input.entry;
  if (!isFiniteNumber(entry) || entry <= 0) throw new RangeError('entry must be a positive number');
  const stop = input.stop;
  if (!isFiniteNumber(stop) || stop <= 0) throw new RangeError('stop must be a positive number');

  const pipSize = input.pipSize ?? pipSizeForDigits(input.digits ?? 5);
  const pipsAtRisk = stopPipsFor(entry, stop, input.direction, pipSize);
  const lot = calculateLotSize({
    balance: input.balance,
    riskPercent: input.riskPercent,
    pipsAtRisk,
    pipValuePerLot: input.pipValuePerLot,
    minLot: input.minLot,
    maxLot: input.maxLot,
    lotStep: input.lotStep,
  });

  return { symbol, direction: input.direction, entry, stop, lot, pipsAtRisk, riskUSD: riskAmount(input.balance, input.riskPercent) };
}
