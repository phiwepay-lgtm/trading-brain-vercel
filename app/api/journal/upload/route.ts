import { extractTrades, MAX_JOURNAL_BYTES } from '../../../../lib/journal';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return Response.json({error:'Send the journal as application/json.'},{status:415});
  if (Number(request.headers.get('content-length') || 0) > MAX_JOURNAL_BYTES) return Response.json({error:'Journal exceeds 4 MB.'},{status:413});
  try {
    const reader = request.body?.getReader(); if (!reader) throw new Error('Missing body');
    let size = 0; const parts: Uint8Array[] = [];
    while (true) { const {value,done} = await reader.read(); if (done) break; size += value.length; if (size > MAX_JOURNAL_BYTES) { await reader.cancel(); return Response.json({error:'Journal exceeds 4 MB.'},{status:413}); } parts.push(value); }
    const body = JSON.parse(Buffer.concat(parts).toString('utf8')); const trades = extractTrades(body);
    return Response.json({count:trades.length,trades},{headers:{'Cache-Control':'no-store'}});
  } catch (error) { return Response.json({error: error instanceof SyntaxError ? 'Invalid JSON.' : error instanceof Error ? error.message : 'Invalid journal.'},{status:400,headers:{'Cache-Control':'no-store'}}); }
}
