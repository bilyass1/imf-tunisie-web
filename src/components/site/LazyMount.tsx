'use client';

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

/**
 * Insère ses enfants à l'approche du viewport, ou immédiatement avec eager.
 *
 * Les modules WebGL (maquette 3D, visite 360°) pèsent chacun plusieurs
 * centaines de kilo-octets : les charger au
 * chargement de la page ralentissait l'affichage initial même quand le
 * visiteur ne descendait jamais jusqu'à eux.
 */
export default function LazyMount({
  children,
  minHeight = 480,
  desktopMinHeight = minHeight,
  rootMargin = '200px',
  loadingLabel,
  eager = false,
}: {
  children: ReactNode;
  minHeight?: number;
  desktopMinHeight?: number;
  rootMargin?: string;
  loadingLabel?: string;
  eager?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(eager);
  const mounted = eager || shown;

  useEffect(() => {
    const el = ref.current;
    if (!el || mounted) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancelPending = () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
      idle = undefined;
      timer = undefined;
    };
    const reveal = () => { setShown(true); io.disconnect(); };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          if (idle !== undefined || timer !== undefined) return;
          // Yield to scrolling and input, with a bounded wait for direct anchor visits.
          if ('requestIdleCallback' in window) idle = window.requestIdleCallback(reveal, { timeout: 500 });
          else timer = setTimeout(reveal, 100);
        } else cancelPending();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelPending(); };
  }, [mounted, rootMargin]);

  return (
    <div ref={ref} className="min-h-[var(--viewer-height)] sm:min-h-[var(--viewer-desktop-height)]" style={{ '--viewer-height': `${minHeight}px`, '--viewer-desktop-height': `${desktopMinHeight}px` } as CSSProperties} data-viewer-mounted={mounted}>
      {mounted ? children : <div role="status" className="grid min-h-[var(--viewer-height)] place-content-center gap-4 rounded-2xl bg-ink/5 p-8 text-center text-ink/60 sm:min-h-[var(--viewer-desktop-height)]">
        <span aria-hidden="true" className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold-300/30 border-t-gold-400 motion-reduce:animate-none" />
        {loadingLabel && <p className="text-sm">{loadingLabel}</p>}
        <button type="button" className="btn-gold mx-auto" onClick={()=>setShown(true)}>{loadingLabel && /[\u0600-\u06ff]/.test(loadingLabel)?'فتح العرض':loadingLabel?.startsWith('Loading')?'Open interactive view':'Ouvrir la vue interactive'}</button>
      </div>}
    </div>
  );
}
