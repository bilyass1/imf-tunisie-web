'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconDownload, IconClose } from '@/components/Icons';
import { useImmersiveViewer } from './useImmersiveViewer';

export interface PlanLabels {
  title: string;
  hint: string;
  download: string;
  missingTitle: string;
  missingBody: string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  fullscreen: string;
  exit: string;
}

/**
 * Visionneuse du plan de vente (image générée depuis le PDF AutoCAD
 * par scripts/generate-plans.mjs). Zoom molette, déplacement à la souris,
 * plein écran, et lien vers le PDF d'origine.
 */
export default function PlanViewer({
  image,
  pdf,
  alt,
  labels,
  exists,
}: {
  image?: string;
  pdf?: string;
  alt: string;
  labels: PlanLabels;
  /** Présence du fichier, résolue côté serveur — évite une requête HEAD. */
  exists?: boolean;
}) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [full, setFull] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ok' | 'missing'>(
    exists === undefined ? (image ? 'checking' : 'missing') : exists && image ? 'ok' : 'missing',
  );
  const drag = useRef<{ x: number; y: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setFull(false), []);
  useImmersiveViewer(full, close, root);

  // Le plan n'est présent qu'après conversion des PDF (npm run plans) :
  // on vérifie sa présence avant de l'afficher, pour éviter une image cassée.
  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
    // Présence déjà résolue côté serveur : aucune requête HEAD nécessaire.
    if (exists !== undefined) {
      setStatus(exists && image ? 'ok' : 'missing');
      return;
    }
    if (!image) {
      setStatus('missing');
      return;
    }
    let alive = true;
    fetch(image, { method: 'HEAD' })
      .then((r) => alive && setStatus(r.ok ? 'ok' : 'missing'))
      .catch(() => alive && setStatus('missing'));
    return () => {
      alive = false;
    };
  }, [image, exists]);

  const clamp = (v: number) => Math.max(1, Math.min(5, v));

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!full && scale === 1 && !event.ctrlKey) return;
      event.preventDefault();
      setScale(s => Math.max(1, Math.min(5, s - event.deltaY * 0.0022)));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [full, scale, status]);

  useEffect(() => {
    if (scale === 1) setPos({ x: 0, y: 0 });
  }, [scale]);

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  if (status === 'checking') {
    return <div className="aspect-[4/3] animate-pulse rounded-2xl border border-ink/8 bg-sand/50" />;
  }

  if (!image || status === 'missing') {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center">
        <p className="font-display text-[22px] font-light text-ink/75">{labels.missingTitle}</p>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-ink/50">{labels.missingBody}</p>
        {pdf && (
          <a href={pdf} target="_blank" rel="noreferrer" className="btn-ghost mt-7">
            <IconDownload className="h-4 w-4" />
            {labels.download}
          </a>
        )}
      </div>
    );
  }

  const viewer = (
    <div
      ref={canvas}
      className={`relative overflow-hidden bg-white ${full ? 'min-h-0 flex-1' : 'aspect-[4/3] rounded-2xl border border-ink/8'}`}
      style={{ touchAction: scale > 1 ? 'none' : 'pan-y' }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button') || scale <= 1) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setPos({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => { drag.current = null; }}
      role="presentation"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={alt}
        draggable={false}
        loading="lazy"
        onError={() => setStatus('missing')}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        className="h-full w-full select-none object-contain transition-transform duration-100 will-change-transform"
      />

      <div className="absolute end-3 top-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setScale((s) => clamp(s + 0.4))}
          aria-label={labels.zoomIn}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink/12 bg-white/90 text-[18px] leading-none text-ink/60 backdrop-blur transition hover:border-gold-400 hover:text-gold-600"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => clamp(s - 0.4))}
          aria-label={labels.zoomOut}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink/12 bg-white/90 text-[18px] leading-none text-ink/60 backdrop-blur transition hover:border-gold-400 hover:text-gold-600"
        >
          −
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-ink/12 bg-white/90 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/60 backdrop-blur transition hover:border-gold-400 hover:text-gold-600"
        >
          {labels.reset}
        </button>
        <button
          type="button"
          aria-label={full ? labels.exit : labels.fullscreen}
          onClick={() => {
            setFull((f) => !f);
            reset();
          }}
          className="rounded-lg border border-ink/12 bg-white/90 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/60 backdrop-blur transition hover:border-gold-400 hover:text-gold-600"
        >
          {full ? <IconClose className="h-4 w-4" /> : '⤢'}
        </button>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] uppercase tracking-[0.16em] text-ink/30">
        {labels.hint}
      </p>
    </div>
  );

  return full ? (
    <div ref={root} role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[120] flex flex-col bg-ivory p-4">{viewer}</div>
  ) : (
    <div>
      {viewer}
      {pdf && (
        <a href={pdf} target="_blank" rel="noreferrer" className="btn-ghost mt-4">
          <IconDownload className="h-4 w-4" />
          {labels.download}
        </a>
      )}
    </div>
  );
}
