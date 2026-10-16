'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Visible-only conditional requests; marketing slows further after inactivity. */
export default function PublicContentRefresh({ initialRevision, endpoint = '/api/public-revision' }: { initialRevision: string; endpoint?: string }) {
  const router = useRouter();
  useEffect(() => {
    let revision = initialRevision, active = true, pending = false, failures = 0, lastActivity = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const isPublic = endpoint === '/api/public-revision';
    const activity = () => { lastActivity = Date.now(); };
    const schedule = () => {
      clearTimeout(timer);
      if (!active || document.hidden) return;
      const base = isPublic ? (Date.now() - lastActivity > 120000 ? 60000 : 45000) : 20000;
      timer = setTimeout(check, Math.min(120000, base * 2 ** failures) * (0.85 + Math.random() * 0.3));
    };
    const check = async () => {
      if (!active || pending || document.hidden) return;
      pending = true;
      try {
        const response = await fetch(endpoint, { headers: { 'If-None-Match': `"${revision}"` }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
        if (response.status === 304) { failures = 0; return; }
        if (!response.ok) throw new Error('Revision unavailable');
        const next = (await response.json()).revision;
        if (typeof next === 'string' && active) { if (next !== revision) router.refresh(); revision = next; }
        failures = 0;
      } catch { failures = Math.min(failures + 1, 3); }
      finally { pending = false; schedule(); }
    };
    const visibility = () => { clearTimeout(timer); if (!document.hidden) void check(); };
    schedule();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', check);
    window.addEventListener('pointerdown', activity, { passive: true });
    window.addEventListener('keydown', activity);
    return () => {
      active = false; controller.abort(); clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', check);
      window.removeEventListener('pointerdown', activity);
      window.removeEventListener('keydown', activity);
    };
  }, [initialRevision, router, endpoint]);
  return null;
}
