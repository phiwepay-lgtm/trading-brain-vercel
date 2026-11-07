import { NextResponse } from 'next/server';

// No broker/bot integration exists. Do not infer a real bot state or P/L.
export function GET() {
  return NextResponse.json({
    mt5_connected: false,
    scanning: false,
    bot_status: 'unknown',
    last_trade_time: null,
    pnl_today: null,
    source: 'No MT5 connection configured',
    checked_at: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
