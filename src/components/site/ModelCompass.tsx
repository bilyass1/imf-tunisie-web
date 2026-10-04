'use client';

import type { RefObject } from 'react';
import type { Camera } from 'three';

type North = readonly [number, number];

/** Project the plan's north vector into the current camera view. */
export function updateModelCompass(camera: Camera, north: North, needle: HTMLDivElement | null) {
  if (!needle) return;
  camera.updateMatrixWorld();
  const e = camera.matrixWorld.elements;
  const right = north[0] * e[0] + north[1] * e[2];
  const up = north[0] * e[4] + north[1] * e[6];
  if (Math.hypot(right, up) < .001) return;
  needle.style.transform = `rotate(${Math.atan2(right, up) * 180 / Math.PI}deg)`;
}

export default function ModelCompass({ needleRef, locale, className = '' }: {
  needleRef: RefObject<HTMLDivElement | null>;
  locale: string;
  className?: string;
}) {
  const label = locale === 'ar'
    ? 'اتجاه الشمال حسب المخطط، يتغير مع تدوير المجسم'
    : locale === 'en'
      ? 'North according to the plan; follows the model rotation'
      : 'Nord selon le plan ; suit la rotation de la maquette';
  return <div role="img" aria-label={label} title={label} dir="ltr"
    className={`viewer-glass pointer-events-none absolute z-10 grid h-[72px] w-[72px] place-items-center rounded-full border border-white/20 shadow-lg ${className}`}>
    <div className="relative h-[58px] w-[58px] rounded-full border border-white/35">
      <span className="absolute left-1/2 top-1 h-1 w-px -translate-x-1/2 bg-white/55" />
      <span className="absolute bottom-1 left-1/2 h-1 w-px -translate-x-1/2 bg-white/55" />
      <span className="absolute left-1 top-1/2 h-px w-1 -translate-y-1/2 bg-white/55" />
      <span className="absolute right-1 top-1/2 h-px w-1 -translate-y-1/2 bg-white/55" />
      <div ref={needleRef} className="absolute inset-0" style={{ transformOrigin: '50% 50%' }} aria-hidden="true">
        <svg viewBox="0 0 58 58" className="h-full w-full" aria-hidden="true">
          <path d="M29 8 23 30 29 26 35 30Z" fill="#d6af5c" />
          <path d="M29 50 23 28 29 32 35 28Z" fill="#f5f1e8" fillOpacity=".75" />
          <circle cx="29" cy="29" r="3" fill="#181715" stroke="#d6af5c" strokeWidth="1.5" />
          <text x="29" y="7" textAnchor="middle" fill="#f3ca70" fontSize="8" fontWeight="700">N</text>
        </svg>
      </div>
    </div>
  </div>;
}
