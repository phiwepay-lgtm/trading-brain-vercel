import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    available: false,
    trades: [],
    message: 'No trade feed is connected. Recent trades are unavailable.',
    checked_at: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
