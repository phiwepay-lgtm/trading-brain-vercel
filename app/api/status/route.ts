import { NextResponse } from 'next/server';

// Deliberately fixed until an actual MT5 integration exists.
export function GET() {
  return NextResponse.json(
    { mt5_connected: false, scanning: false },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
