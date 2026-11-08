'use client';
import { useCallback, useEffect, useState } from 'react';
import { cleanFilters, emptyFilters, FILTER_KEY } from '../../lib/journal-filter.mjs';
export type Filters = {search:string;outcome:string;entryType:string;exec:string;bias:string;sess:string;hour:string};
export function resetJournalFilters() { try {localStorage.removeItem(FILTER_KEY);} catch {} window.dispatchEvent(new Event('journal-filters-updated')); }
export function useJournalFilters() {
  const [filters,setFilters] = useState<Filters>(emptyFilters);
  useEffect(()=>{ const read=()=>{try{setFilters(cleanFilters(JSON.parse(localStorage.getItem(FILTER_KEY)||'null')));}catch{setFilters(emptyFilters());}};read();window.addEventListener('storage',read);window.addEventListener('journal-filters-updated',read);return()=>{window.removeEventListener('storage',read);window.removeEventListener('journal-filters-updated',read);}; },[]);
  const update=useCallback((next:Filters)=>{const value=cleanFilters(next);setFilters(value);try{localStorage.setItem(FILTER_KEY,JSON.stringify(value));}catch{}window.dispatchEvent(new Event('journal-filters-updated'));},[]);
  return {filters,update};
}
