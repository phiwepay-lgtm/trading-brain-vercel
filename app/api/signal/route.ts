import { NextResponse } from 'next/server';

// Placeholder only: chart assessments are deliberately never trading signals.
export function GET() {
  return NextResponse.json({ action: 'HOLD', symbol: null, confidence: null, sl: null, tp: null, signal_id: null, expires_at: null, reason: 'No verified signal provider or MT5 connection configured.' }, { headers: { 'Cache-Control': 'no-store' } });
}
