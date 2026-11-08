// User-provided definitions, not automatically detected confirmations.
export const VLB_DEFINITION = 'VLB - Visual Low Break FOR SELLS: After M5 confirmation, M1 BOS/CHoCH breaks low, small pullback, then engulfing candle continues to new lower low - Entry on engulf';
export const VHB_DEFINITION = 'VHB - Visual High Break FOR BUYS: After M5 confirmation, M1 breaks high (CHoCH), pullback (sometimes none), engulfing to new higher high - Entry on engulf';
export const FTB_DEFINITION = 'FTB - Failed to break new structure then continue';
export function executionDefinition(value) {
  const text = String(value ?? '');
  const vlb = /\bVLB\b/i.test(text), vhb = /\bVHB\b/i.test(text);
  return vlb && vhb ? `${VLB_DEFINITION}\n${VHB_DEFINITION}` : vlb ? VLB_DEFINITION : vhb ? VHB_DEFINITION : null;
}
export function classifySetup(trade) {
  const raw = String(trade.dir ?? trade.side ?? trade.direction ?? trade.type ?? '').trim().toUpperCase();
  const side = raw === 'SELL' || raw === 'SHORT' ? 'SELL' : raw === 'BUY' || raw === 'LONG' ? 'BUY' : null;
  const execution = String(trade.exec ?? ''), vlb = /\bVLB\b/i.test(execution), vhb = /\bVHB\b/i.test(execution);
  const ftb = /\bFTB\b/i.test(String(trade.entryType ?? trade.setup ?? ''));
  if (!side) return {side:null,kind:'unknown',conflict:false,label:'Direction not recorded',color:'#a7b5c6'};
  const conflict = (vlb && vhb) || (vlb && side !== 'SELL') || (vhb && side !== 'BUY');
  if (conflict) return {side,kind:'conflict',conflict:true,label:`Direction conflict - ${side} / ${vlb && vhb ? 'VLB and VHB' : vlb ? 'VLB' : 'VHB'}`,color:'#a7b5c6'};
  if (ftb) return {side,kind:'ftb',conflict:false,label:FTB_DEFINITION,color:'#ffac4b'};
  if (vlb) return {side,kind:'vlb',conflict:false,label:'VLB Sell - BOS low + Engulf to new LL',color:'#ff7181'};
  if (vhb) return {side,kind:'vhb',conflict:false,label:'VHB Buy - BOS high + Engulf to new HH',color:'#35ddb1'};
  return {side,kind:'unclassified',conflict:false,label:`Recorded ${side} - setup not classified`,color:side === 'BUY' ? '#35ddb1' : '#ff7181'};
}

// Shared chart rendering semantics for recorded direction; not an execution price.
export function markerVisual(marker) {
  return {shape: marker.side === 'BUY' ? 'triangleUp' : 'triangleDown', position: marker.side === 'BUY' ? 'belowBar' : 'aboveBar', color: marker.color};
}
