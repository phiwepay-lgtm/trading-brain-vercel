import { NextResponse } from 'next/server';
import brain from '../../../data/brain.json';

export function GET() {
  return NextResponse.json(brain, { headers: { 'Cache-Control': 'no-store' } });
}
