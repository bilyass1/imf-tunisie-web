'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { LA_GLOIRE_SITE } from '@/lib/la-gloire-footprints';
import type { MaquetteLabels } from './Maquette3D';
import type { Lot, Massing } from '@/lib/types';

/** Chargé à la demande : la maquette et three.js restent hors du bundle initial. */
const Maquette3D = dynamic(() => import('./Maquette3D'), {
  ssr: false,
  loading: () => <div className="h-[480px] w-full animate-pulse rounded-2xl bg-ink/10 sm:h-[600px]" />,
});

export default function MaquetteSection({
  locale,
  projectSlug,
  lots,
  massing,
  labels,
  selectedRef,
}: {
  locale: string;
  projectSlug: string;
  lots: Lot[];
  massing: Massing;
  labels: MaquetteLabels;
  selectedRef?: string;
}) {
  const router = useRouter();
  // Existing CRM snapshots can still contain the earlier 3.10 m estimate.
  // Apply the verified drawing height without rewriting any commercial data.
  const displayMassing = useMemo(() => projectSlug === 'residence-la-gloire'
    ? { ...massing, floorHeight: LA_GLOIRE_SITE.floorHeight }
    : massing, [massing, projectSlug]);
  return (
    <Maquette3D
      lots={lots}
      massing={displayMassing}
      labels={labels}
      selectedRef={selectedRef}
      onSelect={(ref) => router.push(`/${locale}/projets/${projectSlug}/appartements/${ref}`)}
    />
  );
}
