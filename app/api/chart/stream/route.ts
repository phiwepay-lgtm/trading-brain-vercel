import WebSocket from 'ws';
import { chartAccess, finite, getSymbol, symbols } from '../../../../lib/chart-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const symbol = getSymbol(new URL(request.url).searchParams.get('symbol'));
  if (!symbol) return Response.json({ error: 'Invalid symbol.' }, { status: 400 });
  const denied = chartAccess(request); if (denied) return denied;
  const encoder = new TextEncoder();
  let dispose = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${encodeURIComponent(process.env.TWELVE_DATA_API_KEY!)}`, { maxPayload: 16384 });
      const send = (event: string, data: unknown) => { if (!closed) { try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { dispose(); } } };
      const timeout = setTimeout(() => { send('status', { state: 'reconnecting' }); dispose(); }, 50000);
      const heartbeat = setInterval(() => { if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ action: 'heartbeat' })); send('heartbeat', {}); } }, 10000);
      dispose = () => { if (closed) return; closed = true; clearTimeout(timeout); clearInterval(heartbeat); request.signal.removeEventListener('abort', dispose); ws.terminate(); try { controller.close(); } catch {} };
      request.signal.addEventListener('abort', dispose, { once: true });
      ws.on('open', () => { send('status', { state: 'subscribing' }); ws.send(JSON.stringify({ action: 'subscribe', params: { symbols: symbols[symbol] } })); });
      ws.on('message', raw => {
        try {
          const text = Array.isArray(raw) ? Buffer.concat(raw).toString('utf8') : Buffer.from(raw as ArrayBuffer).toString('utf8');
          const msg = JSON.parse(text);
          if (msg.event === 'subscribe-status') {
            const success = Array.isArray(msg.success) && msg.success.some((entry: { symbol?: string }) => entry.symbol === symbols[symbol]);
            send('status', { state: success ? 'subscribed' : 'unavailable' });
          } else if (msg.event === 'price' && msg.symbol === symbols[symbol]) {
            const time = finite(msg.timestamp), last = finite(msg.price), bid = finite(msg.bid), ask = finite(msg.ask);
            if (time !== null && Number.isInteger(time) && time >= 1000000000 && time <= 4102444800 && last !== null && last > 0) send('tick', { symbol, time, last, bid: bid !== null && bid > 0 ? bid : null, ask: ask !== null && ask > 0 ? ask : null });
          }
        } catch { /* Ignore malformed provider messages. */ }
      });
      ws.on('error', () => { send('status', { state: 'unavailable' }); dispose(); });
      ws.on('close', () => { send('status', { state: 'disconnected' }); dispose(); });
      if (request.signal.aborted) dispose();
    },
    cancel() { dispose(); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
}
