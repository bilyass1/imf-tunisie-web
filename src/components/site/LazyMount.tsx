'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * N'insère ses enfants qu'à l'approche du viewport.
 *
 * Les modules WebGL (maquette 3D, visite 360°) pèsent chacun plusieurs
 * centaines de kilo-octets et démarrent un rendu continu : les charger au
 * chargement de la page ralentissait l'affichage initial même quand le
 * visiteur ne descendait jamais jusqu'à eux.
 */
export default function LazyMount({
  children,
  minHeight = 480,
  rootMargin = '300px',
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  return (
    <div ref={ref} style={shown ? undefined : { minHeight }}>
      {shown ? children : <div className="h-full w-full animate-pulse rounded-2xl bg-ink/5" style={{ minHeight }} />}
    </div>
  );
}
