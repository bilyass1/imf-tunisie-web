'use client';
import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
const loading = () => <div className="h-[520px] animate-pulse rounded-2xl bg-ink/10" aria-busy="true"/>;
export const DeferredMaquette = dynamic<ComponentProps<typeof import('./MaquetteSection').default>>(() => import('./MaquetteSection'), { ssr: false, loading });
export const DeferredPanorama = dynamic<ComponentProps<typeof import('./Panorama360').default>>(() => import('./Panorama360'), { ssr: false, loading });
export const DeferredYassamine = dynamic<ComponentProps<typeof import('./YassamineMaquette').default>>(() => import('./YassamineMaquette'), { ssr: false, loading });
