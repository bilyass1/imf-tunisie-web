'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconDownload, IconClose } from '@/components/Icons';
import { useImmersiveViewer } from './useImmersiveViewer';
import PlanBrand, { type PlanBrandDetails } from './PlanBrand';
import type { PLAN_ROTATION } from '@/lib/plan-rotation';

type RotationLabels = typeof PLAN_ROTATION.fr;
const normalize = (angle: number) => ((angle % 360) + 360) % 360;
const clampScale = (value: number) => Math.max(1, Math.min(5, value));
type Point = { x: number; y: number };

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
 * Visionneuse du plan présenté sur le site. Zoom molette, déplacement à la
 * souris, plein écran et lien vers son PDF correspondant.
 */
export default function PlanViewer({
  image,
  pdf,
  alt,
  labels,
  exists,
  brand,
  rotation,
}: {
  image?: string;
  pdf?: string;
  alt: string;
  labels: PlanLabels;
  /** Présence du fichier, résolue côté serveur — évite une requête HEAD. */
  exists?: boolean;
  brand?: PlanBrandDetails;
  /** Rotation of the supplied image, not a reconstruction of a 3D model. */
  rotation?: RotationLabels;
}) {
  const [scale, setScale] = useState(1);
  const [angle, setAngle] = useState(0);
  const [mode, setMode] = useState<'rotate' | 'pan'>(rotation ? 'rotate' : 'pan');
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [full, setFull] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ok' | 'missing'>(
    exists === undefined ? (image ? 'checking' : 'missing') : exists && image ? 'ok' : 'missing',
  );
  const pointers = useRef(new Map<number, Point>());
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setFull(false), []);
  useImmersiveViewer(full, close, root);

  // Le plan n'est présent qu'après conversion des PDF (npm run plans) :
  // on vérifie sa présence avant de l'afficher, pour éviter une image cassée.
  useEffect(() => {
    setScale(1);
    setAngle(0);
    setPos({ x: 0, y: 0 });
    pointers.current.clear();
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

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [full, status]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!full && scale === 1 && !event.ctrlKey) return;
      event.preventDefault();
      setScale(s => clampScale(s - event.deltaY * 0.0022));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [full, scale, status]);

  useEffect(() => {
    if (scale === 1) setPos({ x: 0, y: 0 });
  }, [scale]);

  const reset = () => {
    setScale(1);
    setAngle(0);
    setPos({ x: 0, y: 0 });
    pointers.current.clear();
  };

  // Keep the entire drawing visible at every angle before user zoom is applied.
  const baseFit = Math.min(size.width / naturalSize.width, size.height / naturalSize.height);
  const radians = angle * Math.PI / 180;
  const rotatedWidth = baseFit * (naturalSize.width * Math.abs(Math.cos(radians)) + naturalSize.height * Math.abs(Math.sin(radians)));
  const rotatedHeight = baseFit * (naturalSize.width * Math.abs(Math.sin(radians)) + naturalSize.height * Math.abs(Math.cos(radians)));
  const rotationFit = Math.min(1, size.width / rotatedWidth, size.height / rotatedHeight);

  const rotationControls = rotation && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/10 bg-white p-3">
    <button type="button" aria-label={rotation.left} onClick={() => setAngle(value => normalize(value - 15))} className="grid h-10 w-10 place-items-center rounded-lg border border-ink/15 text-xl">↶</button>
    <label className="flex min-w-36 flex-1 items-center gap-3 text-xs text-ink/65">
      <span className="sr-only">{rotation.angle}</span>
      <input type="range" min="0" max="360" step="1" value={Math.round(angle)} onChange={event => setAngle(normalize(Number(event.target.value)))} aria-valuetext={`${Math.round(angle)}°`} className="min-w-0 flex-1 accent-[#b89a4f]" />
      <output className="w-10 tabular-nums">{Math.round(angle)}°</output>
    </label>
    <button type="button" aria-label={rotation.right} onClick={() => setAngle(value => normalize(value + 15))} className="grid h-10 w-10 place-items-center rounded-lg border border-ink/15 text-xl">↷</button>
    <div className="flex gap-1">
      {(['rotate', 'pan'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-10 rounded-lg px-3 text-xs ${mode === value ? 'bg-ink text-white' : 'bg-sand text-ink/65'}`}>{value === 'rotate' ? rotation.rotate : rotation.move}</button>)}
    </div>
  </div>;

  if (status === 'checking') {
    return <div className="aspect-[4/3] animate-pulse rounded-2xl border border-ink/8 bg-sand/50" />;
  }

  if (!image || status === 'missing') {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center">
        <p className="font-display text-[22px] font-light text-ink/75">{labels.missingTitle}</p>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-ink/50">{labels.missingBody}</p>
        {pdf && (
          <a href={pdf} download className="btn-ghost mt-7">
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
      style={{ touchAction: rotation || scale > 1 ? 'none' : 'pan-y' }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button') || (!rotation && scale <= 1)) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }}
      onPointerMove={(e) => {
        const previous = pointers.current.get(e.pointerId);
        if (!previous) return;
        const before = [...pointers.current.values()];
        const current = { x: e.clientX, y: e.clientY };
        pointers.current.set(e.pointerId, current);
        const after = [...pointers.current.values()];
        if (before.length === 2) {
          const vector = (points: Point[]) => ({ x: points[1].x - points[0].x, y: points[1].y - points[0].y });
          const a = vector(before), b = vector(after);
          const distance = Math.hypot(a.x, a.y);
          if (distance > 1) setScale(value => clampScale(value * Math.hypot(b.x, b.y) / distance));
          const delta = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
          if (rotation) setAngle(value => normalize(value + Math.atan2(Math.sin(delta), Math.cos(delta)) * 180 / Math.PI));
          setPos(value => ({ x: value.x + (current.x - previous.x) / 2, y: value.y + (current.y - previous.y) / 2 }));
        } else if (before.length === 1) {
          if (rotation && mode === 'rotate') setAngle(value => normalize(value + (current.x - previous.x) * 0.5));
          else setPos(value => ({ x: value.x + current.x - previous.x, y: value.y + current.y - previous.y }));
        }
      }}
      onPointerUp={e => { pointers.current.delete(e.pointerId); }}
      onPointerCancel={e => { pointers.current.delete(e.pointerId); }}
      onLostPointerCapture={e => { pointers.current.delete(e.pointerId); }}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (rotation && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault(); setAngle(value => normalize(value + (e.key === 'ArrowLeft' ? -15 : 15)));
        } else if (['+', '=', '-'].includes(e.key)) {
          e.preventDefault(); setScale(value => clampScale(value + (e.key === '-' ? -0.4 : 0.4)));
        } else if (e.key === 'Home') { e.preventDefault(); reset(); }
      }}
      tabIndex={rotation ? 0 : undefined}
      role={rotation ? 'region' : 'presentation'}
      aria-label={rotation ? `${alt} · ${rotation.angle}` : undefined}
      data-rotation={Math.round(angle)}
      data-scale={scale.toFixed(2)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={alt}
        draggable={false}
        loading="lazy"
        onError={() => { setFull(false); setStatus('missing'); }}
        onLoad={event => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) rotate(${angle}deg) scale(${scale * rotationFit})` }}
        className="h-full w-full select-none object-contain transition-transform duration-100 will-change-transform"
      />

      <div className="absolute end-3 top-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setScale((s) => clampScale(s + 0.4))}
          aria-label={labels.zoomIn}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink/12 bg-white/90 text-[18px] leading-none text-ink/60 backdrop-blur transition hover:border-gold-400 hover:text-gold-600"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => clampScale(s - 0.4))}
          aria-label={labels.zoomOut}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink/12 bg-white/90 text-[18px] leading-none text-ink/60 backdrop-blur transition hover:border-gold-400 hover:text-gold-600"
        >
          −
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label={labels.reset}
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
        {rotation ? (mode === 'rotate' ? rotation.hint : labels.hint) : labels.hint}
      </p>
    </div>
  );

  return full ? (
    <div ref={root} role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[120] flex flex-col bg-ivory p-4">
      {brand && <PlanBrand {...brand} />}
      {viewer}
      {rotationControls}
    </div>
  ) : (
    <div>
      {brand && <PlanBrand {...brand} />}
      {viewer}
      {rotationControls && <div className="mt-3">{rotationControls}</div>}
      {pdf && (
        <a href={pdf} download className="btn-ghost mt-4">
          <IconDownload className="h-4 w-4" />
          {labels.download}
        </a>
      )}
    </div>
  );
}
