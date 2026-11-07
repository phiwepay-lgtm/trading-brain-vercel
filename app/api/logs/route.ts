import { NextResponse } from 'next/server';

// This endpoint reports only its own actual request. Serverless instances do not
// share persistent memory; no claim is made that these are broker/bot logs.
export function GET() {
  const timestamp = new Date().toISOString();
  console.info('[monitor] diagnostics endpoint requested', timestamp);
  return NextResponse.json({
    event: { id: crypto.randomUUID(), timestamp, level: 'INFO', message: 'Diagnostics API responded. MT5 and trade data are not connected.' },
    source: 'Request diagnostics only; no persistent bot log source is connected.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
