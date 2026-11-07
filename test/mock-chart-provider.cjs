// Test-only provider substitute, installed into a child Next.js process by test:chart.
const realFetch = globalThis.fetch;
globalThis.fetch = async function(input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname !== 'api.twelvedata.com') return realFetch(input, init);
  if (url.searchParams.get('apikey') !== 'test-provider-key') return Response.json({status:'error'}, {status: 401});
  if (url.searchParams.get('symbol') === 'BTC/USD') return Response.json({status:'error', message:'secret must not leak'});
  if (url.pathname === '/price') return Response.json({price:'123.45'});
  if (url.pathname === '/time_series') return Response.json({values:[
    {datetime:'2025-01-02 12:01:00',open:'10',high:'13',low:'9',close:'12'},
    {datetime:'2025-01-02 12:00:00',open:'9',high:'12',low:'8',close:'10',volume:'7'}
  ]});
  return Response.json({status:'error'});
};
