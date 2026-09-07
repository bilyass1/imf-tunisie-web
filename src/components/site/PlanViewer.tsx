'use client';

import { useEffect, useRef, useState } from 'react';
import { IconDownload, IconClose } from '@/components/Icons';

export interface PlanLabels {
  title: string;
  hint: string;
  download: string;
  missingTitle: string;
  missingBody: string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
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

  // Le plan n'est présent qu'après conversion des PDF (npm run plans) :
  // on vérifie sa présence avant de l'afficher, pour éviter une image cassée.
  useEffect(() => {
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

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => clamp(s - e.deltaY * 0.0022));
  };

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
      className={`relative overflow-hidden bg-white ${full ? 'flex-1' : 'aspect-[4/3] rounded-2xl border border-ink/8'}`}
      onWheel={onWheel}
      onMouseDown={(e) => {
        drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      }}
      onMouseMove={(e) => {
        if (!drag.current) return;
        setPos({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
      }}
      onMouseUp={() => {
        drag.current = null;
      }}
      onMouseLeave={() => {
        drag.current = null;
      }}
      role="presentation"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={alt}
        draggable={false}
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
    <div className="fixed inset-0 z-[120] flex flex-col bg-ivory p-4">{viewer}</div>
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
