// Test-only provider stub: no external request and no real credential is used.
const original = globalThis.fetch;
globalThis.fetch = async function (url, options) {
  if (String(url) !== 'https://api.openai.com/v1/chat/completions') return original(url, options);
  const body = JSON.parse(options.body);
  if (!body.messages[0].content[0].text.includes('Visual Low Break for sells') || !body.messages[0].content[0].text.includes('Visual High Break for buys') || body.messages[0].content[0].text.includes('Valid Liquidity Build') || !body.messages[0].content[1].image_url.url.startsWith('data:image/png;base64,')) throw new Error('Unexpected vision request');
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ pattern: 'Mock pattern', bias: 'unknown', entry: null, sl: null, tp: null, rr: null, confidence: null, verdict: 'TAKE', notes: 'Mock response: missing evidence.' }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
};
