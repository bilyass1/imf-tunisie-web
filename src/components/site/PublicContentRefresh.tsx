'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Refresh server-rendered public content after a commercial edit in any tab or instance. */
export default function PublicContentRefresh({ initialRevision }: { initialRevision: string }) {
  const router = useRouter();
  useEffect(() => {
    let lastRevision = initialRevision;
    let active = true;
    let pending = false;
    const check = async () => {
      if (!active || pending || document.visibilityState !== 'visible') return;
      pending = true;
      try {
        const response = await fetch('/api/public-revision', { cache: 'no-store' });
        if (!response.ok) return;
        const { revision } = await response.json() as { revision?: string };
        if (!revision || !active) return;
        if (revision !== lastRevision) router.refresh();
        lastRevision = revision;
      } catch { /* The next focus or interval retries. */ }
      finally { pending = false; }
    };
    void check();
    const timer = window.setInterval(() => void check(), 20000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [initialRevision, router]);
  return null;
}
