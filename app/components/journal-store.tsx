'use client';
import { useCallback, useEffect, useState } from 'react';
import { extractTrades, JOURNAL_KEY, MAX_JOURNAL_BYTES, type TradeRecord } from '../../lib/journal';
import { resetJournalFilters } from './journal-filters';
export type Journal = { trades: TradeRecord[]; rawText: string; uploadedAt: string };
function read(): Journal | null {
  try { const stored = JSON.parse(localStorage.getItem(JOURNAL_KEY) || 'null'); if (!stored || typeof stored.rawText !== 'string' || typeof stored.uploadedAt !== 'string') return null; return {trades:extractTrades(JSON.parse(stored.rawText)),rawText:stored.rawText,uploadedAt:stored.uploadedAt}; } catch { return null; }
}
export function useJournal() {
  const [journal,setJournal] = useState<Journal | null>(null), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  useEffect(() => { const update = () => setJournal(read()); update(); window.addEventListener('storage',update); window.addEventListener('journal-updated',update); return () => { window.removeEventListener('storage',update); window.removeEventListener('journal-updated',update); }; }, []);
  const upload = useCallback(async (file: File) => {
    setError(''); if (file.size > MAX_JOURNAL_BYTES) { setError('Journal must be under 4 MB.'); return; }
    setBusy(true);
    try {
      const rawText = await file.text(); const parsed = JSON.parse(rawText); const localTrades = extractTrades(parsed);
      const response = await fetch('/api/journal/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:rawText,cache:'no-store'});
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Upload failed.');
      if (!Array.isArray(data.trades) || data.count !== data.trades.length || data.count !== localTrades.length) throw new Error('Upload response did not match the file.');
      const record = {rawText,uploadedAt:new Date().toISOString()};
      try { localStorage.setItem(JOURNAL_KEY,JSON.stringify(record)); } catch { throw new Error('Browser storage is full or unavailable. Remove large screenshots or free space and try again; the previous journal was not replaced.'); }
      resetJournalFilters();
      console.log(`[Trading Brain] Journal validated: ${data.count} trades.`); // Never log raw journal content.
      setJournal({ ...record, trades:data.trades }); window.dispatchEvent(new Event('journal-updated'));
    } catch (err) { setError(err instanceof SyntaxError ? 'Invalid JSON.' : err instanceof Error ? err.message : 'Upload failed.'); }
    finally { setBusy(false); }
  },[]);
  const clear = useCallback(() => { resetJournalFilters(); try { localStorage.removeItem(JOURNAL_KEY); } catch {} setJournal(null); window.dispatchEvent(new Event('journal-updated')); },[]);
  return {journal,error,busy,upload,clear};
}
