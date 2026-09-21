'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { propertyCopy } from '@/lib/property-copy';
import { visitHref } from '@/lib/property-search';

const KEY = 'imf-property-selection-v1';
type Selection = { favourites: string[]; comparison: string[] };
type SelectionContext = Selection & { ready: boolean; storageError: boolean; toggle: (kind: keyof Selection, id: string) => boolean };
const Context = createContext<SelectionContext | null>(null);
function decode(raw: string | null): Selection {
  try {
    const data = JSON.parse(raw ?? '{}');
    const ids = (value: unknown, limit: number) => Array.isArray(value) ? Array.from(new Set(value.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]+\/[a-zA-Z0-9.-]+$/.test(s)))).slice(0, limit) : [];
    return { favourites: ids(data?.favourites, 200), comparison: ids(data?.comparison, 3) };
  } catch { return { favourites: [], comparison: [] }; }
}
export function PropertySelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>({ favourites: [], comparison: [] });
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try { setSelection(decode(localStorage.getItem(KEY))); } catch { setStorageError(true); }
    setReady(true);
    const sync = (e: StorageEvent) => { if (e.key === KEY || e.key === null) setSelection(decode(e.newValue)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function toggle(kind: keyof Selection, id: string) {
    const present = selection[kind].includes(id);
    if (!present && selection[kind].length >= (kind === 'comparison' ? 3 : 200)) return false;
    const next = { ...selection, [kind]: present ? selection[kind].filter(v => v !== id) : [...selection[kind], id] };
    setSelection(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
    return true;
  }
  return <Context.Provider value={{ ...selection, ready, storageError, toggle }}>{children}</Context.Provider>;
}
export function usePropertySelection() {
  const context = useContext(Context);
  if (!context) throw new Error('PropertySelectionProvider required');
  return context;
}
export default function PropertyActions({ id, locale, showVisit = false, available = true }: { id: string; locale: Locale; showVisit?: boolean; available?: boolean }) {
  const selection = usePropertySelection();
  const copy = propertyCopy[locale];
  const [message, setMessage] = useState('');
  const [project, ref] = id.split('/');
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      {(['favourites','comparison'] as const).map(kind => {
        const selected = selection[kind].includes(id);
        return <button key={kind} type="button" disabled={!selection.ready} aria-pressed={selected}
          onClick={() => setMessage(selection.toggle(kind, id) ? '' : copy.maxCompare)}
          className={`rounded-full border px-4 py-2.5 text-sm transition disabled:opacity-50 ${selected ? 'border-gold-500 bg-gold-100 text-ink' : 'border-ink/20 bg-white text-ink hover:border-gold-500'}`}>
          {kind === 'favourites' ? `${selected ? '♥' : '♡'} ${selected ? copy.unfavourite : copy.favourite}` : selected ? copy.compared : copy.compare}
        </button>;
      })}
      {showVisit && available && <Link href={visitHref(locale, project, ref)} className="btn-gold !px-5 !py-2.5">{copy.visit}</Link>}
      {showVisit && <Link className="rounded-full border border-ink/20 bg-white px-4 py-2.5 text-sm text-ink" href={`/${locale}/selection`}>{copy.selection}</Link>}
    </div>
    <p role="status" className="text-sm text-gold-700">{message || (selection.storageError ? copy.storageError : '')}</p>
  </div>;
}
